import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { has, insert, remove, rowOf } from '@engine/tables/tableOps';
import type { Vec2 } from '@shared/math/vec2';
import { ContactDetected, HitLanded, RigBodiesMoved } from '../../../messages/brawlMessages';
import { RimHit } from '../../../messages/dishMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { applyHit, bounce, type HitResult } from '../rules/applyHit';
import { createHitContext, pickDirection, resolveHit, type HitContext } from '../rules/resolveHit';
import type { BrawlState } from '../state/brawlState';

/**
 * Rig-to-Rig contacts and Rim bounces. Each contact is read through the hitOutcomes
 * condition table from both sides; the stronger outcome (lower priority) happens.
 */
export function contactHandlers(state: BrawlState, ctx: DomainContext): HandlerDef[] {
  const b = state.bodies.cols;
  const contextAB = createHitContext();
  const contextBA = createHitContext();
  const attacker: Vec2 = { x: 0, y: 0 };
  const defender: Vec2 = { x: 0, y: 0 };
  const hitBodies = { attacker, defender, defenderWeight: 1, attackerBaseSpeed: 1 };
  const result: HitResult = { damage: 0, attackerSpeed: 0, launchVz: 0, gear: 0 };

  const moveOf = (id: number) => {
    const row = rowOf(state.moveStates, id);
    return row === -1 ? { move: '', age: 0 } : { move: state.moveStates.cols.state[row], age: state.moveStates.cols.age[row] };
  };
  const attackOf = (id: number) => {
    const row = rowOf(state.attacks, id);
    return row === -1 ? undefined : { kind: state.attacks.cols.kind[row], reach: state.attacks.cols.reach[row] };
  };
  /** 1 when `id`'s attack covers the direction (nx, ny) toward the rival (its reach arc). */
  const covers = (id: number, nx: number, ny: number) => {
    const row = rowOf(state.attacks, id);
    if (row === -1) return false;
    const a = state.attacks.cols;
    return a.arcCos[row] <= -1 || a.dirX[row] * nx + a.dirY[row] * ny >= a.arcCos[row];
  };

  const fill = (out: HitContext, a: number, d: number, nx: number, ny: number) => {
    const aId = state.bodies.ids[a];
    const dId = state.bodies.ids[d];
    const attack = covers(aId, nx, ny) ? attackOf(aId) : undefined;
    const defenderAttack = attackOf(dId);
    const aMove = moveOf(aId);
    const dMove = moveOf(dId);
    out.attackKind = attack?.kind ?? 'none';
    out.attackerActive = attack ? 1 : 0;
    out.attackerMove = aMove.move;
    out.attackerAirborne = b.z[a] > 0 ? 1 : 0;
    out.defenderMove = dMove.move;
    out.defenderMoveAge = dMove.age;
    out.defenderAttackKind = defenderAttack?.kind ?? 'none';
    out.defenderIFrames = has(state.iFrames, dId) ? 1 : 0;
    out.defenderAirborne = b.z[d] > 0 ? 1 : 0;
    out.defenderVulnerable = ctx.data.moves.moveTuning.vulnerableStates.includes(dMove.move) ? 1 : 0;
    out.attackerAbove = b.z[a] - b.z[d] > ctx.data.brawl.motion.aboveThreshold ? 1 : 0;
    out.attackerSpeed = Math.hypot(b.vx[a], b.vy[a]);
    return out;
  };

  /** Sends body `d` up (juggles launch lower each time) or, when negative, straight down (Spike). */
  const launch = (d: number, launchVz: number) => {
    if (launchVz < 0) {
      if (b.z[d] > 0) b.vz[d] = Math.min(b.vz[d], launchVz);
      return;
    }
    if (launchVz === 0) return;
    const dId = state.bodies.ids[d];
    const jugglesRow = rowOf(state.juggles, dId);
    const juggles = jugglesRow === -1 ? 0 : state.juggles.cols.count[jugglesRow];
    const motion = ctx.data.brawl.motion;
    // A launch never peaks above launchApexCap, however high the Rig already is.
    const capVz = Math.sqrt(Math.max(0, 2 * motion.gravity * (motion.launchApexCap - b.z[d])));
    b.vz[d] = Math.max(b.vz[d], Math.min(capVz, launchVz * motion.juggleLaunchDecay ** juggles));
    b.z[d] = Math.max(b.z[d], 0.01);
    insert(state.juggles, dId, { count: juggles + 1 });
  };

  /** A slung Rig hit the Rim: the slinger's follow-up hit (Wall Splat) lands with no attacker contact. */
  const wallSplat = (row: number, nx: number, ny: number) => {
    const id = state.bodies.ids[row];
    const slungRow = rowOf(state.slung, id);
    if (slungRow === -1) return;
    const by = state.slung.cols.by[slungRow];
    const hit = state.slung.cols.hit[slungRow];
    remove(state.slung, id);
    const spec = ctx.data.brawl.hits[hit];
    if (!spec || spec.effect !== 'hit') return;
    const multiplierRow = rowOf(state.multipliers, by);
    const damage = (spec.damage ?? 0) * (multiplierRow === -1 ? 1 : state.multipliers.cols.multiplier[multiplierRow]);
    launch(row, spec.launchVz ?? 0);
    if ((spec.defenderIFrames ?? 0) > 0) insert(state.iFrames, id, { timeLeft: spec.defenderIFrames ?? 0 });
    const x = b.x[row] - nx * b.radius[row];
    const y = b.y[row] - ny * b.radius[row];
    ctx.publish(HitLanded, { attackerId: by, defenderId: id, hit, damage, speed: Math.hypot(b.vx[row], b.vy[row]), x, y, nx: -nx, ny: -ny, afterRim: 0, gear: 0 });
  };

  /** Resolves an attack of body `a` on body `d`; n points from a to d. */
  const land = (a: number, d: number, hit: string, nx: number, ny: number) => {
    const spec = ctx.data.brawl.hits[hit];
    const aId = state.bodies.ids[a];
    const dId = state.bodies.ids[d];
    const steerRow = rowOf(state.steer, aId);
    const multiplierRow = rowOf(state.multipliers, aId);
    attacker.x = b.vx[a];
    attacker.y = b.vy[a];
    defender.x = b.vx[d];
    defender.y = b.vy[d];
    hitBodies.defenderWeight = b.weight[d];
    hitBodies.attackerBaseSpeed = b.baseSpeed[a];
    applyHit(
      hitBodies,
      nx,
      ny,
      steerRow === -1 ? 0 : state.steer.cols.x[steerRow],
      steerRow === -1 ? 0 : state.steer.cols.y[steerRow],
      spec,
      multiplierRow === -1 ? 1 : state.multipliers.cols.multiplier[multiplierRow],
      ctx.data.brawl.gears.gears,
      result,
    );
    b.vx[a] = attacker.x;
    b.vy[a] = attacker.y;
    b.vx[d] = defender.x;
    b.vy[d] = defender.y;
    launch(d, result.launchVz);
    if (spec.onRim) insert(state.slung, dId, { by: aId, hit: spec.onRim, timeLeft: ctx.data.brawl.motion.slingRimSeconds });
    remove(state.attacks, aId);
    if ((spec.defenderIFrames ?? 0) > 0) insert(state.iFrames, dId, { timeLeft: spec.defenderIFrames ?? 0 });
    ctx.publish(HitLanded, {
      attackerId: aId,
      defenderId: dId,
      hit,
      damage: result.damage,
      speed: result.attackerSpeed,
      x: b.x[a] + nx * b.radius[a],
      y: b.y[a] + ny * b.radius[a],
      nx,
      ny,
      afterRim: has(state.rimRecent, aId) ? 1 : 0,
      gear: result.gear,
    });
  };

  const detectContacts = on(RigBodiesMoved, 'brawl.detectContacts', () => {
    const hits = ctx.data.brawl.hits;
    const rows = ctx.data.brawl.hitOutcomes;
    const contactHeight = ctx.data.brawl.motion.contactHeight;
    const heightlessKinds = ctx.data.brawl.motion.heightlessAttackKinds;
    const heightlessTargets = ctx.data.brawl.motion.heightlessTargetStates;
    for (let i = 0; i < state.bodies.count; i++) {
      for (let j = i + 1; j < state.bodies.count; j++) {
        const idA = state.bodies.ids[i];
        const idB = state.bodies.ids[j];
        const pairKey = Math.min(idA, idB) * state.rigCapacity + Math.max(idA, idB);
        const dx = b.x[j] - b.x[i];
        const dy = b.y[j] - b.y[i];
        const distance = Math.hypot(dx, dy);
        if (distance === 0) continue;
        const nx = dx / distance;
        const ny = dy / distance;
        const reachA = covers(idA, nx, ny) ? (attackOf(idA)?.reach ?? 1) : 1;
        const reachB = covers(idB, -nx, -ny) ? (attackOf(idB)?.reach ?? 1) : 1;
        const touchDistance = b.radius[i] * reachA + b.radius[j] * reachB;
        const caught = (attacker: number, target: number) =>
          heightlessKinds.includes(attackOf(attacker)?.kind ?? '') && heightlessTargets.includes(moveOf(target).move);
        const heightless = caught(idA, idB) || caught(idB, idA);
        if (distance >= touchDistance || (!heightless && Math.abs(b.z[i] - b.z[j]) >= contactHeight)) {
          remove(state.touching, pairKey);
          continue;
        }
        const firstTouch = !has(state.touching, pairKey);
        insert(state.touching, pairKey);

        // Physical overlap: push apart by inverse weight.
        const overlap = b.radius[i] + b.radius[j] - distance;
        if (overlap > 0) {
          const inverseA = 1 / b.weight[i];
          const inverseB = 1 / b.weight[j];
          const share = overlap / (inverseA + inverseB);
          b.x[i] -= nx * share * inverseA;
          b.y[i] -= ny * share * inverseA;
          b.x[j] += nx * share * inverseB;
          b.y[j] += ny * share * inverseB;
        }

        const refs = ctx.data.moves.moveTuning.timings;
        const ab = resolveHit(rows, fill(contextAB, i, j, nx, ny), refs);
        const ba = resolveHit(rows, fill(contextBA, j, i, -nx, -ny), refs);
        const direction = pickDirection(ab, ba, hits, contextAB.attackerSpeed, contextBA.attackerSpeed);
        if (direction === undefined) continue;
        const aWins = direction === 'a';
        const outcome = aWins ? ab : ba;
        if (!outcome) continue;
        const spec = hits[outcome.hit];
        if (!spec) continue;

        if (spec.effect === 'hit') {
          // A reversed hit (Deflect) lands as the defender's hit on the attacker.
          const attackerIsA = aWins !== (spec.reverse === true);
          if (attackerIsA) land(i, j, outcome.hit, nx, ny);
          else land(j, i, outcome.hit, -nx, -ny);
          continue;
        }

        // effect "bounce": plain physics.
        attacker.x = b.vx[i];
        attacker.y = b.vy[i];
        defender.x = b.vx[j];
        defender.y = b.vy[j];
        const approach = bounce(attacker, defender, b.weight[i], b.weight[j], nx, ny, spec.restitution ?? 0.8);
        b.vx[i] = attacker.x;
        b.vy[i] = attacker.y;
        b.vx[j] = defender.x;
        b.vy[j] = defender.y;
        if (firstTouch && approach >= (spec.minSpeed ?? 0)) {
          ctx.publish(ContactDetected, {
            rigA: idA,
            rigB: idB,
            speed: approach,
            nx,
            ny,
            x: b.x[i] + nx * b.radius[i],
            y: b.y[i] + ny * b.radius[i],
          });
        }
      }
    }
  });

  const resolveRimHit = on(RimHit, 'brawl.resolveRimHit', (batch) => {
    for (let i = 0; i < batch.count; i++) {
      const id = batch.cols.rigId[i];
      const row = rowOf(state.bodies, id);
      if (row === -1) continue;
      const nx = batch.cols.nx[i];
      const ny = batch.cols.ny[i];
      b.x[row] += nx * batch.cols.depth[i];
      b.y[row] += ny * batch.cols.depth[i];
      const inward = b.vx[row] * nx + b.vy[row] * ny;
      if (inward < 0) {
        const restitution = batch.cols.restitution[i];
        b.vx[row] -= (1 + restitution) * inward * nx;
        b.vy[row] -= (1 + restitution) * inward * ny;
        insert(state.rimRecent, id, { timeLeft: ctx.data.brawl.motion.rimChainSeconds });
        wallSplat(row, nx, ny);
      }
    }
  });

  return [detectContacts, resolveRimHit];
}
