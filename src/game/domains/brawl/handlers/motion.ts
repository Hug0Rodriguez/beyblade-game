import { StepTicked } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { remove, rowOf } from '@engine/tables/tableOps';
import type { Vec2 } from '@shared/math/vec2';
import { AttackWhiffed, GearChanged, Landed, RigBodiesMoved } from '../../../messages/brawlMessages';
import { nextGear } from '../rules/gears';
import { towardNearest, turnToward } from '../rules/nearest';
import type { DomainContext } from '../../../shared/domainContext';
import { isActive } from '../../../shared/flowWatch';
import { steerAir, steerGround } from '../rules/steerMotion';
import type { BrawlState } from '../state/brawlState';

type TimerTable = BrawlState['iFrames'] | BrawlState['rimRecent'] | BrawlState['slung'];

/** Counts a timer table down and removes rows whose time ran out. */
function tickTimers(table: TimerTable, dt: number): void {
  for (let row = table.count - 1; row >= 0; row--) {
    table.cols.timeLeft[row] -= dt;
    if (table.cols.timeLeft[row] <= 0) remove(table, table.ids[row]);
  }
}

/** Each step: move every body (base / surplus bands on the ground, gravity in the air) and track its Gear. */
export function motionHandlers(state: BrawlState, ctx: DomainContext): HandlerDef[] {
  const velocity: Vec2 = { x: 0, y: 0 };
  const toRival: Vec2 = { x: 0, y: 0 };
  const b = state.bodies.cols;

  return [
    on(StepTicked, 'brawl.integrateMotion', (batch) => {
      if (!isActive(state.flow, ctx.data.flow.activity.simulation)) return;
      const motion = ctx.data.brawl.motion;
      const dt = batch.cols.dt[batch.count - 1];
      // Attacks that run out without landing are whiffs.
      for (let row = state.attacks.count - 1; row >= 0; row--) {
        state.attacks.cols.timeLeft[row] -= dt;
        if (state.attacks.cols.timeLeft[row] > 0) continue;
        ctx.publish(AttackWhiffed, { rigId: state.attacks.ids[row], move: state.attacks.cols.move[row] });
        remove(state.attacks, state.attacks.ids[row]);
      }
      tickTimers(state.iFrames, dt);
      tickTimers(state.rimRecent, dt);
      tickTimers(state.slung, dt);
      for (let row = 0; row < state.moveStates.count; row++) state.moveStates.cols.age[row] += dt;

      for (let row = 0; row < state.bodies.count; row++) {
        const id = state.bodies.ids[row];
        const moveRow = rowOf(state.moveStates, id);
        const moveState = moveRow === -1 ? '' : state.moveStates.cols.state[moveRow];
        const braking = motion.brakeStates.includes(moveState);
        const control = !braking && !motion.noControlStates.includes(moveState);
        const steerRow = rowOf(state.steer, id);
        const steerX = control && steerRow !== -1 ? state.steer.cols.x[steerRow] : 0;
        const steerY = control && steerRow !== -1 ? state.steer.cols.y[steerRow] : 0;
        const forceRow = rowOf(state.forces, id);

        velocity.x = b.vx[row];
        velocity.y = b.vy[row];
        const wasAirborne = b.z[row] > 0 || b.vz[row] > 0;
        if (!wasAirborne) {
          steerGround(velocity, steerX, steerY, b.baseSpeed[row], motion, dt);
          if (braking) {
            // Planted (Whirl brace, rev-up, reach): speed bleeds off and the slope can't move you.
            const keep = Math.exp(-motion.brakePerSecond * dt);
            velocity.x *= keep;
            velocity.y *= keep;
          } else if (forceRow !== -1) {
            velocity.x += state.forces.cols.ax[forceRow] * dt;
            velocity.y += state.forces.cols.ay[forceRow] * dt;
          }
        } else {
          steerAir(velocity, steerX, steerY, motion, dt);
          b.vz[row] -= motion.gravity * dt;
          b.z[row] += b.vz[row] * dt;
          if (b.z[row] <= 0) {
            const impactSpeed = -b.vz[row];
            b.z[row] = 0;
            b.vz[row] = 0;
            remove(state.juggles, id);
            ctx.publish(Landed, { rigId: id, impactSpeed, x: b.x[row], y: b.y[row] });
          }
        }
        if (forceRow !== -1) {
          state.forces.cols.ax[forceRow] = 0;
          state.forces.cols.ay[forceRow] = 0;
        }

        // Homing moves (the Shatter) keep turning toward the rival while they last.
        if (motion.homingStates.includes(moveState) && towardNearest(state.bodies, row, toRival)) {
          turnToward(velocity, toRival.x, toRival.y, motion.homingTurnRate * dt);
        }
        const speed = Math.hypot(velocity.x, velocity.y);
        if (speed > motion.maxSpeed) {
          velocity.x *= motion.maxSpeed / speed;
          velocity.y *= motion.maxSpeed / speed;
        }
        b.vx[row] = velocity.x;
        b.vy[row] = velocity.y;
        const gears = ctx.data.brawl.gears;
        const gear = nextGear(gears.gears, b.gear[row], Math.hypot(velocity.x, velocity.y), b.baseSpeed[row], gears.dropMargin);
        if (gear !== b.gear[row]) {
          b.gear[row] = gear;
          ctx.publish(GearChanged, { rigId: id, gear });
        }
        b.x[row] += velocity.x * dt;
        b.y[row] += velocity.y * dt;
        if (speed > 20) {
          b.facingX[row] = velocity.x / speed;
          b.facingY[row] = velocity.y / speed;
        } else if (steerX !== 0 || steerY !== 0) {
          const stick = Math.hypot(steerX, steerY);
          b.facingX[row] = steerX / stick;
          b.facingY[row] = steerY / stick;
        }
        ctx.publish(RigBodiesMoved, {
          rigId: id,
          x: b.x[row],
          y: b.y[row],
          z: b.z[row],
          vx: b.vx[row],
          vy: b.vy[row],
          vz: b.vz[row],
          airborne: b.z[row] > 0 ? 1 : 0,
          teleported: 0,
        });
      }
    }),
  ];
}
