import { StateEntered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { clear, has, insert, rowOf } from '@engine/tables/tableOps';
import { length } from '@shared/math/vec2';
import { DishForcesComputed } from '../../../messages/dishMessages';
import { GearChanged, RigBodiesMoved } from '../../../messages/brawlMessages';
import { MoveStarted } from '../../../messages/moveMessages';
import { RigReady } from '../../../messages/rigMessages';
import { RoundStarted } from '../../../messages/roundMessages';
import { SpinnerCommandIssued } from '../../../messages/spinnerMessages';
import { RevChanged } from '../../../messages/styleMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { watchFlow } from '../../../shared/flowWatch';
import { rigOfSpinner } from '../../../shared/ids';
import { dropInPoint } from '../../../shared/dataLookups';
import { towardNearest } from '../rules/nearest';
import type { BrawlState } from '../state/brawlState';

/** Bodies: created from RigReady, dropped in on RoundStarted, steered, pushed, and kicked by moves. */
export function bodyLifecycleHandlers(state: BrawlState, ctx: DomainContext): HandlerDef[] {
  const b = state.bodies.cols;

  const onMoveStarted = on(MoveStarted, 'brawl.onMoveStarted', (batch) => {
    const aim = { x: 0, y: 0 };
    for (let i = 0; i < batch.count; i++) {
      const rigId = batch.cols.rigId[i];
      const row = rowOf(state.bodies, rigId);
      const spec = ctx.data.moves.moveTuning.moves[batch.cols.move[i]];
      if (row === -1 || !spec) continue;
      aim.x = batch.cols.dirX[i];
      aim.y = batch.cols.dirY[i];
      if (length(aim.x, aim.y) === 0) {
        aim.x = b.facingX[row];
        aim.y = b.facingY[row];
      }
      const speed = length(b.vx[row], b.vy[row]);
      switch (spec.impulse) {
        case 'burst': {
          const next = Math.max(spec.speed ?? 0, speed);
          b.vx[row] = aim.x * next;
          b.vy[row] = aim.y * next;
          break;
        }
        case 'boost': {
          // Spend what you built: the Dash adds to your current speed.
          const next = speed + (spec.boost ?? 0);
          b.vx[row] = aim.x * next;
          b.vy[row] = aim.y * next;
          break;
        }
        case 'homing': {
          towardNearest(state.bodies, row, aim);
          const next = Math.max(spec.speed ?? 0, speed);
          b.vx[row] = aim.x * next;
          b.vy[row] = aim.y * next;
          break;
        }
        case 'hop':
          b.vz[row] = spec.vz ?? 0;
          b.z[row] = Math.max(b.z[row], 0.01);
          break;
        case 'dive':
          b.vz[row] = -(spec.vz ?? 0);
          if (spec.speed) {
            b.vx[row] = aim.x * spec.speed;
            b.vy[row] = aim.y * spec.speed;
          }
          break;
        case 'breakOut':
          b.vz[row] = spec.vz ?? 0;
          b.vx[row] *= -0.4;
          b.vy[row] *= -0.4;
          break;
        default:
          break;
      }
      if (spec.activeSeconds > 0 && spec.attackKind !== 'none') {
        insert(state.attacks, rigId, {
          move: batch.cols.move[i],
          kind: spec.attackKind,
          timeLeft: spec.activeSeconds,
          reach: spec.reachRatio ?? 1,
          dirX: aim.x,
          dirY: aim.y,
          arcCos: spec.reachArcRadians === undefined ? -1 : Math.cos(spec.reachArcRadians / 2),
        });
      }
      if (spec.iFrameSeconds > 0) {
        const current = has(state.iFrames, rigId) ? state.iFrames.cols.timeLeft[rowOf(state.iFrames, rigId)] : 0;
        insert(state.iFrames, rigId, { timeLeft: Math.max(current, spec.iFrameSeconds) });
      }
    }
  });

  return [
    on(RigReady, 'brawl.onRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rigId = batch.cols.rigId[i];
        insert(state.bodies, rigId, {
          slot: batch.cols.slot[i],
          radius: batch.cols.radius[i],
          weight: batch.cols.weight[i],
          baseSpeed: batch.cols.baseSpeed[i],
          facingX: batch.cols.slot[i] % 2 === 0 ? 1 : -1,
        });
        insert(state.steer, rigId);
        insert(state.forces, rigId);
      }
    }),
    on(RoundStarted, 'brawl.onRoundStarted', () => {
      clear(state.attacks);
      clear(state.iFrames);
      clear(state.rimRecent);
      clear(state.touching);
      clear(state.juggles);
      clear(state.slung);
      const dropHeight = ctx.data.round.countdown.dropHeight;
      for (let row = 0; row < state.bodies.count; row++) {
        const spot = dropInPoint(ctx.data, b.slot[row]);
        b.x[row] = spot.x;
        b.y[row] = spot.y;
        b.z[row] = dropHeight;
        b.vx[row] = 0;
        b.vy[row] = 0;
        b.vz[row] = 0;
        b.facingX[row] = spot.x > 0 ? -1 : 1;
        b.facingY[row] = 0;
        const id = state.bodies.ids[row];
        insert(state.steer, id, { x: 0, y: 0 });
        insert(state.forces, id, { ax: 0, ay: 0 });
        b.gear[row] = 0;
        ctx.publish(GearChanged, { rigId: id, gear: 0 });
        ctx.publish(RigBodiesMoved, { rigId: id, x: b.x[row], y: b.y[row], z: b.z[row], vx: 0, vy: 0, vz: 0, airborne: 1, teleported: 1 });
      }
    }),
    on(SpinnerCommandIssued, 'brawl.applySteer', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rigId = rigOfSpinner(batch.cols.spinnerId[i]);
        if (!has(state.steer, rigId)) continue;
        let x = batch.cols.steerX[i];
        let y = batch.cols.steerY[i];
        const stick = length(x, y);
        if (stick > 1) {
          x /= stick;
          y /= stick;
        }
        insert(state.steer, rigId, { x, y });
      }
    }),
    on(DishForcesComputed, 'brawl.applyForces', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (has(state.forces, batch.cols.rigId[i])) insert(state.forces, batch.cols.rigId[i], { ax: batch.cols.ax[i], ay: batch.cols.ay[i] });
      }
    }),
    onMoveStarted,
    on(RevChanged, 'brawl.onRevChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.multipliers, batch.cols.rigId[i], { multiplier: batch.cols.multiplier[i] });
    }),
    on(StateEntered, 'brawl.onStateEntered', (batch) => {
      watchFlow(state.flow, batch);
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.fsm[i] !== ctx.data.moves.moveTuning.fsm) continue;
        insert(state.moveStates, batch.cols.instance[i], { state: batch.cols.state[i], age: 0 });
      }
    }),
  ];
}
