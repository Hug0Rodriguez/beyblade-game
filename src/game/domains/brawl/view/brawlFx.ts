import { FrameRendered, StateEntered, TimeScaleRequested } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { createCamera } from '@engine/render/camera';
import { createCameraShake } from '@engine/render/cameraShake';
import { createParticleEmitter } from '@engine/render/particles/particleEmitter';
import { createRibbonTrail, type RibbonTrail } from '@engine/render/trails/ribbonTrail';
import { clamp, lerp, TAU } from '@shared/math/scalar';
import { ContactDetected, GearChanged, HitLanded, Landed, RigBodiesMoved } from '../../../messages/brawlMessages';
import { RimHit } from '../../../messages/dishMessages';
import { MoveStarted } from '../../../messages/moveMessages';
import { RigReady } from '../../../messages/rigMessages';
import { RoundFinished, RoundStarted } from '../../../messages/roundMessages';
import type { ViewContext } from '../../../shared/domainContext';

interface TrackedRig {
  prevX: number;
  prevY: number;
  prevZ: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  radius: number;
  baseSpeed: number;
  color: string;
  /** Trail colour: the Gear colour (gears.json; "" = the Rig's own colour). */
  trailColor: string;
  readonly trail: RibbonTrail;
}

/**
 * Impact and speed feedback, all from messages: sparks, streaks, dust, Gear-coloured trails, screen shake,
 * hit-stop (TimeScaleRequested) and the camera (follows the fight, zooms with distance and speed).
 */
export function brawlFxHandlers(ctx: ViewContext): HandlerDef[] {
  const fx = () => ctx.data.brawl.brawlFx;
  const emitter = createParticleEmitter(ctx.data.boot.capacities.particles);
  ctx.screens.layer('fx').addChild(emitter.view);
  const shake = createCameraShake(ctx.screens.worldShake);
  const camera = createCamera(ctx.screens.worldCamera);
  const random = ctx.random('brawl.view');
  const rigs = new Map<number, TrackedRig>();
  let following = false;

  const track = (rigId: number): TrackedRig => {
    let rig = rigs.get(rigId);
    if (!rig) {
      const trail = createRibbonTrail(ctx.data.boot.capacities.trailPoints);
      ctx.screens.layer('trails').addChild(trail.view);
      rig = { prevX: 0, prevY: 0, prevZ: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, radius: 20, baseSpeed: 1, color: '#ffffff', trailColor: '#ffffff', trail };
      rigs.set(rigId, rig);
    }
    return rig;
  };

  const updateCamera = (alpha: number, dt: number) => {
    const tuning = ctx.data.brawl.camera;
    if (!following || rigs.size === 0) {
      camera.setTarget(0, 0, 1);
      camera.update(dt, tuning);
      return;
    }
    let sumX = 0;
    let sumY = 0;
    let sumVx = 0;
    let sumVy = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let fastest = 0;
    for (const rig of rigs.values()) {
      const x = lerp(rig.prevX, rig.x, alpha);
      const y = lerp(rig.prevY, rig.y, alpha);
      sumX += x;
      sumY += y;
      sumVx += rig.vx;
      sumVy += rig.vy;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      fastest = Math.max(fastest, Math.hypot(rig.vx, rig.vy));
    }
    const count = rigs.size;
    const keep = 1 - tuning.centerPull;
    const targetX = (sumX / count + (sumVx / count) * tuning.leadSeconds) * keep;
    const targetY = (sumY / count + (sumVy / count) * tuning.leadSeconds) * keep;
    const spread = Math.hypot(maxX - minX, maxY - minY);
    const t = clamp((spread - tuning.nearDistance) / (tuning.farDistance - tuning.nearDistance), 0, 1);
    const zoom = lerp(tuning.nearZoom, tuning.farZoom, t) - fastest * tuning.speedZoomOut;
    camera.setTarget(targetX, targetY, Math.max(tuning.farZoom, zoom));
    camera.update(dt, tuning);
  };

  return [
    on(RigReady, 'brawl.view.onRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rig = track(batch.cols.rigId[i]);
        rig.radius = batch.cols.radius[i];
        rig.baseSpeed = batch.cols.baseSpeed[i];
        rig.color = batch.cols.color[i];
        rig.trailColor = rig.color;
      }
    }),
    on(GearChanged, 'brawl.view.onGearChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rig = rigs.get(batch.cols.rigId[i]);
        if (rig) rig.trailColor = ctx.data.brawl.gears.gears[batch.cols.gear[i]]?.color || rig.color;
      }
    }),
    on(StateEntered, 'brawl.view.onFlowState', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.fsm[i] !== ctx.data.screens.screens.fsm) continue;
        following = ctx.data.flow.activity.simulation.includes(batch.cols.state[i]);
      }
    }),
    on(RoundStarted, 'brawl.view.onRoundStarted', () => {
      for (const rig of rigs.values()) rig.trail.reset();
    }),
    on(RigBodiesMoved, 'brawl.view.trackBodies', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rig = track(batch.cols.rigId[i]);
        const teleported = batch.cols.teleported[i] === 1;
        rig.prevX = teleported ? batch.cols.x[i] : rig.x;
        rig.prevY = teleported ? batch.cols.y[i] : rig.y;
        rig.prevZ = teleported ? batch.cols.z[i] : rig.z;
        rig.x = batch.cols.x[i];
        rig.y = batch.cols.y[i];
        rig.z = batch.cols.z[i];
        rig.vx = batch.cols.vx[i];
        rig.vy = batch.cols.vy[i];
        if (teleported) rig.trail.reset();
      }
    }),
    on(HitLanded, 'brawl.view.onHitLanded', (batch) => {
      const { sparks, hitStopScale } = fx();
      for (let i = 0; i < batch.count; i++) {
        const spec = ctx.data.brawl.hits[batch.cols.hit[i]];
        const count = Math.min(sparks.maxCount, Math.ceil(sparks.count + batch.cols.damage[i] * sparks.perDamage));
        const angle = Math.atan2(batch.cols.ny[i], batch.cols.nx[i]);
        for (const direction of [angle + Math.PI / 2, angle - Math.PI / 2, angle]) {
          emitter.emit(
            batch.cols.x[i],
            batch.cols.y[i],
            { ...sparks, count: Math.ceil(count / 3), angle: direction, spread: sparks.spread ?? 1, color: random.pick(sparks.colors) },
            random.next,
          );
        }
        const kick = spec?.shake ?? 0;
        shake.kick(kick);
        camera.punch(kick * ctx.data.brawl.camera.hitPunchPerShake);
        const stop = (spec?.hitStop ?? 0) * hitStopScale;
        if (stop > 0) ctx.publish(TimeScaleRequested, { scale: 0, seconds: stop });
        if (ctx.data.round.roundRules.shatterHits.includes(batch.cols.hit[i])) {
          const shatter = fx().shatter;
          ctx.publish(TimeScaleRequested, shatter.hitSlowMo);
          camera.punch(shatter.hitPunch);
          emitter.emit(batch.cols.x[i], batch.cols.y[i], { ...shatter.burst, angle: 0, spread: TAU, color: shatter.burst.color ?? '#ffffff' }, random.next);
        }
      }
    }),
    on(ContactDetected, 'brawl.view.onContact', (batch) => {
      const bump = fx().bumpSparks;
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.speed[i] < bump.minSpeed) continue;
        emitter.emit(batch.cols.x[i], batch.cols.y[i], { ...bump, angle: 0, spread: TAU, color: bump.color ?? '#ffffff' }, random.next);
        shake.kick(0.08);
      }
    }),
    on(RimHit, 'brawl.view.onRimHit', (batch) => {
      const wallSparks = fx().wallSparks;
      for (let i = 0; i < batch.count; i++) {
        const rig = rigs.get(batch.cols.rigId[i]);
        if (!rig || Math.hypot(rig.vx, rig.vy) < wallSparks.minSpeed) continue;
        const angle = Math.atan2(batch.cols.ny[i], batch.cols.nx[i]);
        emitter.emit(
          rig.x - batch.cols.nx[i] * rig.radius,
          rig.y - batch.cols.ny[i] * rig.radius,
          { ...wallSparks, angle, spread: wallSparks.spread ?? 1, color: wallSparks.color ?? '#ffffff' },
          random.next,
        );
      }
    }),
    on(MoveStarted, 'brawl.view.onMoveStarted', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rig = rigs.get(batch.cols.rigId[i]);
        const burst = fx().moveBursts[batch.cols.move[i]];
        if (!rig || !burst) continue;
        if (ctx.data.moves.moveTuning.moves[batch.cols.move[i]]?.attackKind === 'shatter') {
          ctx.publish(TimeScaleRequested, fx().shatter.startSlowMo);
          camera.punch(fx().shatter.hitPunch * 0.5);
        }
        const behind = Math.atan2(-batch.cols.dirY[i], -batch.cols.dirX[i]);
        emitter.emit(
          rig.x,
          rig.y - rig.z * fx().height.liftPerUnit,
          { ...burst, angle: burst.direction === 'behind' ? behind : 0, spread: burst.spread ?? TAU, color: burst.color ?? rig.color },
          random.next,
        );
      }
    }),
    on(Landed, 'brawl.view.onLanded', (batch) => {
      const dust = fx().landingDust;
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.impactSpeed[i] < dust.minImpact) continue;
        emitter.emit(batch.cols.x[i], batch.cols.y[i], { ...dust, angle: 0, spread: TAU, color: dust.color ?? '#ffffff' }, random.next);
        shake.kick(Math.min(0.3, batch.cols.impactSpeed[i] / 3000));
      }
    }),
    on(RoundFinished, 'brawl.view.onRoundFinished', () => {
      shake.kick(fx().shake.finishKick);
      camera.punch(ctx.data.brawl.camera.finishPunch);
      ctx.publish(TimeScaleRequested, { scale: fx().finishSlowMo.scale, seconds: fx().finishSlowMo.seconds });
    }),
    on(FrameRendered, 'brawl.view.render', (batch) => {
      const alpha = batch.cols.alpha[batch.count - 1];
      const dt = batch.cols.frameDt[batch.count - 1];
      const trail = fx().trail;
      const lift = fx().height.liftPerUnit;
      for (const rig of rigs.values()) {
        const speed = Math.hypot(rig.vx, rig.vy);
        if (speed >= trail.minSpeed) rig.trail.push(lerp(rig.prevX, rig.x, alpha), lerp(rig.prevY, rig.y, alpha) - lerp(rig.prevZ, rig.z, alpha) * lift);
        const surplus = speed > rig.baseSpeed * 1.05;
        rig.trail.redraw({ length: trail.length, width: rig.radius * trail.widthRatio, color: rig.trailColor, alpha: surplus ? trail.surplusAlpha : trail.alpha });
      }
      emitter.update(dt);
      shake.update(dt, fx().shake);
      updateCamera(alpha, dt);
    }),
  ];
}
