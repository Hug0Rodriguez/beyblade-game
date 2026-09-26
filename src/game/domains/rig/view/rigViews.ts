import { Container, Graphics, GraphicsPath, Matrix, Text, type TextStyleFontWeight } from 'pixi.js';
import { FrameRendered, StateEntered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { createParticleEmitter } from '@engine/render/particles/particleEmitter';
import { lerp, TAU } from '@shared/math/scalar';
import { GearChanged, HitLanded, Landed, RigBodiesMoved } from '../../../messages/brawlMessages';
import { MoveRefused, MoveStarted } from '../../../messages/moveMessages';
import { RigReady, RigSpinChanged } from '../../../messages/rigMessages';
import { RoundFinished, RoundStarted } from '../../../messages/roundMessages';
import { RevChanged, ShatterCharging } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { drawRig } from './drawRig';

interface RigView {
  readonly root: Container;
  readonly shadow: Graphics;
  readonly body: Container;
  readonly flash: Graphics;
  readonly ring: Graphics;
  /** Tells drawn around the Rig: rev-up arrow, Hook reach arc, recovery pulse, stun stars, refused flash. */
  readonly tell: Graphics;
  /** Dive landing marker, on the ground under the Rig. */
  readonly marker: Graphics;
  readonly radius: number;
  move: string;
  moveAge: number;
  aimX: number;
  aimY: number;
  vx: number;
  vy: number;
  refusedTime: number;
  /** Current Gear (0–3): pips over the Rig, a flame ring at the top Gear. */
  gear: number;
  readonly color: string;
  /** Rev Rank (what a Rev Cancel can spend) and the "REV CANCEL" prompt shown while one is available. */
  rank: number;
  readonly revLabel: Text;
  /** Shatter charge 0..1 at ZENITH (the rival's warning). */
  charge: number;
  readonly colors: readonly string[];
  prevX: number;
  prevY: number;
  prevZ: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  spinRatio: number;
  squash: number;
  flashTime: number;
  wobbleTime: number;
  gone: boolean;
  toppled: boolean;
}

interface Tether {
  readonly from: number;
  readonly to: number;
  time: number;
}

/**
 * The Rigs: interpolated position, height (lift, scale, shadow), spin, squash, hit flash, Finish
 * effects, and the **tells** (brawlFx.tells) that let a player read a move before it lands.
 */
export function rigViewHandlers(ctx: ViewContext): HandlerDef[] {
  const shadows = ctx.screens.layer('shadows');
  const rigs = ctx.screens.layer('rigs');
  const emitter = createParticleEmitter(Math.floor(ctx.data.boot.capacities.particles / 3));
  ctx.screens.layer('fx').addChild(emitter.view);
  const random = ctx.random('rig.view');
  const views = new Map<number, RigView>();
  const fx = () => ctx.data.brawl.brawlFx;
  const tethers = new Graphics();
  ctx.screens.layer('fx').addChild(tethers);
  const activeTethers: Tether[] = [];
  let clock = 0;

  const screenY = (y: number, z: number) => y - z * fx().height.liftPerUnit;

  /** Move glyphs (moveGlyphs.json): parsed once; drawn scaled to the Rig, turned along the aim. */
  const glyphPaths = new Map<string, GraphicsPath>();
  const glyphOf = (move: string) => Object.values(ctx.data.moves.moveGlyphs.glyphs).find((glyph) => glyph.moves.includes(move));
  const drawGlyph = (g: Graphics, path: string, color: string, radius: number, x: number, y: number, rotation: number) => {
    const look = ctx.data.moves.moveGlyphs.dishTells;
    let parsed = glyphPaths.get(path);
    if (!parsed) glyphPaths.set(path, (parsed = new GraphicsPath(path)));
    const size = radius * look.glyphSizeRatio;
    const matrix = new Matrix().translate(-12, -12).scale(size / 24, size / 24).rotate(rotation).translate(x, y);
    g.path(parsed.transform(matrix)).stroke({ color, width: look.glyphWidth, alpha: look.glyphAlpha, join: 'round', cap: 'round' });
  };

  /** Draws this frame's tells for one Rig (local to its root, so they lift with it). */
  const drawTells = (view: RigView) => {
    const tells = fx().tells;
    const g = view.tell;
    g.clear();
    const aim = Math.atan2(view.aimY, view.aimX);
    // The move's silhouette: strikes and grabs point along the aim in front of the Rig; the guard's shield sits over it.
    const glyph = view.gone ? undefined : glyphOf(view.move);
    if (glyph && glyph.role !== 'none' && glyph.role !== 'slam') {
      const distance = view.radius * ctx.data.moves.moveGlyphs.dishTells.glyphDistanceRatio;
      if (glyph.role === 'guard') drawGlyph(g, glyph.path, glyph.color, view.radius, 0, -distance, 0);
      else drawGlyph(g, glyph.path, glyph.color, view.radius, Math.cos(aim) * distance, Math.sin(aim) * distance, aim + Math.PI / 2);
    }
    if (tells.revUp.moves.includes(view.move)) {
      const on = Math.sin(clock * tells.revUp.flashPerSecond) > 0 ? 1 : 0.45;
      const tip = view.radius * tells.revUp.arrowLength;
      g.moveTo(Math.cos(aim) * view.radius, Math.sin(aim) * view.radius).lineTo(Math.cos(aim) * tip, Math.sin(aim) * tip);
      g.stroke({ color: tells.revUp.color, width: tells.revUp.width, alpha: tells.revUp.alpha * on });
      g.circle(0, 0, view.radius * 1.12).stroke({ color: tells.revUp.color, width: 2, alpha: tells.revUp.alpha * on });
    }
    if (tells.reach.moves.includes(view.move)) {
      const spec = ctx.data.moves.moveTuning.moves[view.move]?.reachRatio ? ctx.data.moves.moveTuning.moves[view.move] : ctx.data.moves.moveTuning.moves.hook;
      const reach = view.radius * (spec?.reachRatio ?? 1.8);
      const half = (spec?.reachArcRadians ?? TAU) / 2;
      g.arc(0, 0, reach, aim - half, aim + half).stroke({ color: tells.reach.color, width: tells.reach.width, alpha: tells.reach.alpha });
      g.moveTo(Math.cos(aim - half) * view.radius, Math.sin(aim - half) * view.radius).lineTo(Math.cos(aim - half) * reach, Math.sin(aim - half) * reach);
      g.moveTo(Math.cos(aim + half) * view.radius, Math.sin(aim + half) * view.radius).lineTo(Math.cos(aim + half) * reach, Math.sin(aim + half) * reach);
      g.stroke({ color: tells.reach.color, width: 1, alpha: tells.reach.alpha * 0.6 });
    }
    if (view.charge > 0 && !view.gone) {
      const look = tells.shatterCharge;
      const pulse = view.charge >= 1 ? 0.6 + 0.4 * Math.abs(Math.sin(clock * look.readyPulsePerSecond)) : 1;
      g.arc(0, 0, view.radius * 1.5, -Math.PI / 2, -Math.PI / 2 + TAU * view.charge).stroke({ color: look.color, width: look.width, alpha: look.alpha * pulse });
    }
    const cancel = ctx.data.moves.moveTuning.revCancel;
    const canCancel = cancel.states.includes(view.move) && view.rank >= cancel.rankCost && !view.gone;
    view.revLabel.visible = canCancel;
    if (canCancel) {
      const pulse = 0.5 + 0.5 * Math.sin(clock * tells.recover.pulsePerSecond);
      g.circle(0, 0, view.radius * 1.3).stroke({ color: tells.revCancel.color, width: 3, alpha: tells.revCancel.alpha + 0.4 * pulse });
    } else if (tells.recover.moves.includes(view.move)) {
      const pulse = 0.5 + 0.5 * Math.sin(clock * tells.recover.pulsePerSecond);
      g.circle(0, 0, view.radius * 1.08).fill({ color: tells.recover.color, alpha: tells.recover.alpha * pulse });
    }
    if (tells.stunned.moves.includes(view.move)) {
      const orbit = clock * tells.stunned.orbitPerSecond;
      for (let i = 0; i < tells.stunned.starCount; i++) {
        const angle = orbit + (i * TAU) / tells.stunned.starCount;
        g.star(Math.cos(angle) * view.radius * 0.9, -view.radius * 1.1 + Math.sin(angle) * view.radius * 0.35, 5, view.radius * 0.28, view.radius * 0.12);
      }
      g.fill({ color: tells.stunned.color, alpha: tells.stunned.alpha });
    }
    if (view.refusedTime > 0) {
      g.circle(0, 0, view.radius * 1.15).stroke({ color: tells.refused.color, width: 4, alpha: view.refusedTime / tells.refused.seconds });
    }
    const gearLook = ctx.data.brawl.gears.look;
    const gears = ctx.data.brawl.gears.gears;
    const gearColor = gears[view.gear]?.color || view.color;
    for (let pip = 0; pip < view.gear; pip++) {
      const x = (pip - (view.gear - 1) / 2) * gearLook.pipGap;
      g.circle(x, -view.radius * gearLook.pipLiftRatio, gearLook.pipRadius);
    }
    if (view.gear > 0) g.fill({ color: gearColor, alpha: 0.95 });
    if (view.gear > 0 && view.gear === gears.length - 1) {
      const flicker = 0.6 + 0.4 * Math.abs(Math.sin(clock * gearLook.flameFlickerPerSecond));
      g.circle(0, 0, view.radius * 1.22).stroke({ color: gearColor, width: gearLook.flameWidth, alpha: gearLook.flameAlpha * flicker });
    }
    const marker = tells.landingMarker;
    view.marker.visible = marker.moves.includes(view.move) && !view.gone;
  };

  const drawTethers = (dt: number) => {
    const tether = fx().tells.tether;
    tethers.clear();
    for (let i = activeTethers.length - 1; i >= 0; i--) {
      const link = activeTethers[i];
      link.time -= dt;
      const from = views.get(link.from);
      const to = views.get(link.to);
      if (link.time <= 0 || !from || !to) {
        activeTethers.splice(i, 1);
        continue;
      }
      tethers
        .moveTo(from.x, screenY(from.y, from.z))
        .lineTo(to.x, screenY(to.y, to.z))
        .stroke({ color: tether.color, width: tether.width, alpha: link.time / tether.seconds });
    }
  };

  /** Finish effects by name — finishConditions.json picks one per Finish. */
  const finishEffects: Record<string, (view: RigView) => void> = {
    none: () => {},
    topple: (view) => {
      view.toppled = true;
    },
    spill: (view) => {
      view.gone = true;
    },
    shatter: (view) => {
      view.gone = true;
      for (const color of view.colors) {
        emitter.emit(view.x, view.y - view.z, { count: 18, speedMin: 120, speedMax: 520, life: 0.8, size: 6, drag: 1.8, color, angle: 0, spread: TAU }, random.next);
      }
    },
  };

  const render = (alpha: number, dt: number) => {
    clock += dt;
    const height = fx().height;
    const squashTuning = fx().squash;
    for (const view of views.values()) {
      const x = lerp(view.prevX, view.x, alpha);
      const y = lerp(view.prevY, view.y, alpha);
      const z = Math.max(0, lerp(view.prevZ, view.z, alpha));
      const boost = fx().whirlRing.moves.includes(view.move) ? fx().whirlRing.spinBoost : 1;
      view.angle += ctx.data.brawl.motion.spinDirection * (4 + 30 * view.spinRatio) * boost * dt;
      view.wobbleTime += dt;
      view.squash = Math.max(0, view.squash - squashTuning.recoverPerSecond * view.squash * dt);
      view.flashTime = Math.max(0, view.flashTime - dt);

      const wobble = view.toppled ? 0 : (1 - view.spinRatio) * view.radius * 0.18;
      view.root.visible = !view.gone;
      view.shadow.visible = !view.gone;
      view.shadow.position.set(x + height.shadowOffset, y + height.shadowOffset);
      view.shadow.scale.set(Math.max(0.3, 1 - z * height.shadowShrinkPerUnit));
      view.shadow.alpha = height.shadowAlpha * Math.max(0.25, 1 - z * height.shadowShrinkPerUnit);
      view.root.position.set(x + Math.cos(view.wobbleTime * 11) * wobble, y - z * height.liftPerUnit + Math.sin(view.wobbleTime * 11) * wobble);
      const lift = 1 + z * height.scalePerUnit;
      view.root.scale.set(lift * (1 + view.squash), lift * (1 - view.squash * 0.6));
      view.body.rotation = view.toppled ? view.body.rotation : view.angle;
      view.body.alpha = view.toppled ? 0.55 : 1;
      view.flash.alpha = view.flashTime > 0 ? view.flashTime / fx().flashSeconds : 0;
      view.ring.visible = fx().whirlRing.moves.includes(view.move);
      view.moveAge += dt;
      view.refusedTime = Math.max(0, view.refusedTime - dt);
      view.marker.position.set(x, y);
      drawTells(view);
    }
    drawTethers(dt);
    emitter.update(dt);
  };

  return [
    on(RigReady, 'rig.view.onRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rigId = batch.cols.rigId[i];
        const old = views.get(rigId);
        old?.root.destroy({ children: true });
        old?.shadow.destroy();
        old?.marker.destroy();
        const radius = batch.cols.radius[i];
        const { body, flash } = drawRig({ radius, color: batch.cols.color[i], accentColor: batch.cols.accentColor[i], blades: batch.cols.blades[i] });
        const root = new Container();
        const reach = ctx.data.moves.moveTuning.moves.whirl?.reachRatio ?? 1.5;
        const ringLook = ctx.data.brawl.brawlFx.whirlRing;
        const ring = new Graphics().circle(0, 0, radius * reach).stroke({ color: ringLook.color, width: ringLook.width, alpha: ringLook.alpha });
        ring.visible = false;
        const tell = new Graphics();
        const cancelLook = ctx.data.brawl.brawlFx.tells.revCancel;
        const hudFont = ctx.data.hud.hud.font;
        const revLabel = new Text({
          text: cancelLook.label,
          style: { fontFamily: hudFont.fontFamily, fontWeight: hudFont.fontWeight as TextStyleFontWeight, fontSize: cancelLook.fontSize, fill: cancelLook.color, stroke: { color: '#08060f', width: 3 } },
        });
        revLabel.anchor.set(0.5, 0);
        revLabel.y = radius * 1.45;
        revLabel.visible = false;
        root.addChild(ring, tell, body, revLabel);
        const shadow = new Graphics().circle(0, 0, radius).fill({ color: '#000000' });
        const markerLook = ctx.data.brawl.brawlFx.tells.landingMarker;
        const marker = new Graphics()
          .circle(0, 0, radius * 1.3)
          .moveTo(-radius * 1.6, 0)
          .lineTo(radius * 1.6, 0)
          .moveTo(0, -radius * 1.6)
          .lineTo(0, radius * 1.6)
          .stroke({ color: markerLook.color, width: markerLook.width, alpha: markerLook.alpha });
        const diveGlyph = ctx.data.moves.moveGlyphs.glyphs.dive;
        if (diveGlyph) drawGlyph(marker, diveGlyph.path, diveGlyph.color, radius, 0, 0, 0);
        marker.visible = false;
        shadows.addChild(shadow, marker);
        rigs.addChild(root);
        views.set(rigId, {
          root, shadow, body, flash, ring, tell, marker, radius, move: '', moveAge: 0,
          aimX: batch.cols.slot[i] % 2 === 0 ? 1 : -1, aimY: 0, vx: 0, vy: 0, refusedTime: 0, gear: 0, color: batch.cols.color[i], rank: 0, revLabel, charge: 0,
          colors: [batch.cols.color[i], batch.cols.accentColor[i], '#0d0b18'],
          prevX: 0, prevY: 0, prevZ: 0, x: 0, y: 0, z: 0, angle: 0, spinRatio: 1,
          squash: 0, flashTime: 0, wobbleTime: 0, gone: false, toppled: false,
        });
      }
    }),
    on(RoundStarted, 'rig.view.onRoundStarted', () => {
      for (const view of views.values()) {
        view.gone = false;
        view.toppled = false;
        view.spinRatio = 1;
        view.squash = 0;
        view.refusedTime = 0;
      }
      activeTethers.length = 0;
    }),
    on(StateEntered, 'rig.view.onMoveState', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.fsm[i] !== ctx.data.moves.moveTuning.fsm) continue;
        const view = views.get(batch.cols.instance[i]);
        if (!view) continue;
        view.move = batch.cols.state[i];
        view.moveAge = 0;
      }
    }),
    on(RigBodiesMoved, 'rig.view.trackBodies', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (!view) continue;
        const teleported = batch.cols.teleported[i] === 1;
        view.prevX = teleported ? batch.cols.x[i] : view.x;
        view.prevY = teleported ? batch.cols.y[i] : view.y;
        view.prevZ = teleported ? batch.cols.z[i] : view.z;
        view.x = batch.cols.x[i];
        view.y = batch.cols.y[i];
        view.z = batch.cols.z[i];
        view.vx = batch.cols.vx[i];
        view.vy = batch.cols.vy[i];
      }
    }),
    // A move's aim (the stick, else where the Rig is heading) orients its tell.
    on(MoveStarted, 'rig.view.onMoveStarted', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (!view) continue;
        const dirX = batch.cols.dirX[i];
        const dirY = batch.cols.dirY[i];
        const speed = Math.hypot(view.vx, view.vy);
        if (dirX !== 0 || dirY !== 0) {
          view.aimX = dirX;
          view.aimY = dirY;
        } else if (speed > 1) {
          view.aimX = view.vx / speed;
          view.aimY = view.vy / speed;
        }
      }
    }),
    on(ShatterCharging, 'rig.view.onShatterCharging', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (view) view.charge = batch.cols.progress[i];
      }
    }),
    on(RevChanged, 'rig.view.onRevChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (view) view.rank = batch.cols.rank[i];
      }
    }),
    on(GearChanged, 'rig.view.onGearChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (view) view.gear = batch.cols.gear[i];
      }
    }),
    on(MoveRefused, 'rig.view.onMoveRefused', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (view) view.refusedTime = fx().tells.refused.seconds;
      }
    }),
    on(RigSpinChanged, 'rig.view.onSpinChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (view) view.spinRatio = batch.cols.spinRatio[i];
      }
    }),
    on(HitLanded, 'rig.view.onHitLanded', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const defender = views.get(batch.cols.defenderId[i]);
        const attacker = views.get(batch.cols.attackerId[i]);
        if (defender) {
          defender.flashTime = fx().flashSeconds;
          defender.squash = fx().squash.hitAmount;
        }
        if (attacker) attacker.squash = fx().squash.hitAmount * 0.5;
        const spec = ctx.data.brawl.hits[batch.cols.hit[i]];
        if (spec?.aimKnockback || (spec?.launchVz ?? 0) < 0) {
          activeTethers.push({ from: batch.cols.attackerId[i], to: batch.cols.defenderId[i], time: fx().tells.tether.seconds });
        }
      }
    }),
    on(Landed, 'rig.view.onLanded', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (view) view.squash = Math.min(0.45, fx().squash.landAmount * Math.min(1, batch.cols.impactSpeed[i] / 600));
      }
    }),
    on(RoundFinished, 'rig.view.onRoundFinished', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.loserRigId[i]);
        const finish = ctx.data.round.finishConditions.find((row) => row.finish === batch.cols.finish[i]);
        if (view && finish) (finishEffects[finish.rigEffect] ?? finishEffects.none)(view);
      }
    }),
    on(FrameRendered, 'rig.view.render', (batch) => {
      render(batch.cols.alpha[batch.count - 1], batch.cols.frameDt[batch.count - 1]);
    }),
  ];
}
