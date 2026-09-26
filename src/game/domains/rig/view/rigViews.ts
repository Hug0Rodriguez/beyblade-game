import { Container, Graphics, Text, type TextStyleFontWeight } from 'pixi.js';
import { FrameRendered, StateEntered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { createParticleEmitter } from '@engine/render/particles/particleEmitter';
import { lerp, TAU } from '@shared/math/scalar';
import { GearChanged, HitLanded, Landed, RigBodiesMoved } from '../../../messages/brawlMessages';
import { MoveRefused, MoveStarted } from '../../../messages/moveMessages';
import { RigReady, RigSpinChanged } from '../../../messages/rigMessages';
import { RoundFinished, RoundStarted } from '../../../messages/roundMessages';
import { SpinnerCommandIssued } from '../../../messages/spinnerMessages';
import { RevChanged, ShatterCharging } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { rigOfSpinner } from '../../../shared/ids';
import { copyForm, drawRigBlades, drawRigShadow, drawRigShape, easeForm, resolveForm, type MutableForm, type RigLook } from './rigForm';

interface RigView {
  readonly root: Container;
  /** Squashes along `squashAngle` (a hit flattens along its direction; a pull stretches). */
  readonly squashNode: Container;
  /** Counter-rotates the squash, carries the tilt wobble and the tall/wide silhouette. */
  readonly formNode: Container;
  readonly shape: Graphics;
  readonly blades: Graphics;
  readonly flash: Graphics;
  readonly shadow: Graphics;
  /** Signs that are not the body: refused press, Rev Cancel, Shatter charge, Gear pips. */
  readonly tell: Graphics;
  readonly look: RigLook;
  readonly radius: number;
  /** The body's current form, eased toward the move's form every frame. */
  readonly form: MutableForm;
  formName: string;
  /** Holds the current form target for a beat after a hit (the needle pierces through). */
  holdFormTime: number;
  move: string;
  moveAge: number;
  aimX: number;
  aimY: number;
  vx: number;
  vy: number;
  refusedTime: number;
  gear: number;
  readonly color: string;
  rank: number;
  readonly revLabel: Text;
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
  squashAngle: number;
  flashTime: number;
  /** The shell's white parry flash. */
  rimFlashTime: number;
  /** While > 0 the claw is drawn wrapped around its victim (tethers), not on the body. */
  wrapTime: number;
  wobbleTime: number;
  gone: boolean;
  toppled: boolean;
}

interface Tether {
  readonly from: number;
  readonly to: number;
  time: number;
}

interface GroundRing {
  x: number;
  y: number;
  age: number;
  radius: number;
}

/**
 * The Rigs: interpolated position, height (lift, scale, shadow), spin, and the **form** the body
 * takes for its move (rigForms.json): a needle to strike, a shell to guard, a claw to grab, a
 * weight to slam, open when vulnerable. Hits play out on the forms (outcomeFx.json).
 */
export function rigViewHandlers(ctx: ViewContext): HandlerDef[] {
  const shadows = ctx.screens.layer('shadows');
  const rigs = ctx.screens.layer('rigs');
  const emitter = createParticleEmitter(Math.floor(ctx.data.boot.capacities.particles / 3));
  ctx.screens.layer('fx').addChild(emitter.view);
  const random = ctx.random('rig.view');
  const views = new Map<number, RigView>();
  const debug = { hits: [] as string[] };
  if (import.meta.env.DEV) Object.assign(window as unknown as Record<string, unknown>, { __rigViews: views, __rigDebug: debug });
  const fx = () => ctx.data.brawl.brawlFx;
  const forms = () => ctx.data.rig.rigForms;
  const outcomes = () => ctx.data.brawl.outcomeFx;
  const overlay = new Graphics();
  ctx.screens.layer('fx').addChild(overlay);
  const activeTethers: Tether[] = [];
  const rings: GroundRing[] = [];
  let clock = 0;

  const screenY = (y: number, z: number) => y - z * fx().height.liftPerUnit;
  const formNameOf = (move: string) => forms().states[move] ?? 'default';
  const accentOf = (view: RigView) => forms().forms[view.formName]?.accent ?? view.color;

  /** Signs around the body that are not the form itself. */
  const drawTells = (view: RigView) => {
    const tells = fx().tells;
    const g = view.tell;
    g.clear();
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
    }
    if (view.refusedTime > 0) {
      g.circle(0, 0, view.radius * 1.15).stroke({ color: tells.refused.color, width: 4, alpha: view.refusedTime / tells.refused.seconds });
    }
    if (view.rimFlashTime > 0) {
      const r = view.radius * view.form.discScale;
      g.circle(0, 0, r).stroke({ color: '#ffffff', width: view.radius * view.form.rimWidth + 2, alpha: view.rimFlashTime / outcomes().rimFlashSeconds });
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
  };

  /** World-space overlays: the claw wrapped around its victim with the pull line, and ground rings. */
  const drawOverlay = (dt: number) => {
    const tether = fx().tells.tether;
    const outcome = outcomes();
    overlay.clear();
    for (let i = activeTethers.length - 1; i >= 0; i--) {
      const link = activeTethers[i];
      link.time -= dt;
      const from = views.get(link.from);
      const to = views.get(link.to);
      if (link.time <= 0 || !from || !to) {
        activeTethers.splice(i, 1);
        continue;
      }
      const alpha = Math.min(1, link.time / tether.seconds + 0.3);
      const fx0 = from.x;
      const fy0 = screenY(from.y, from.z);
      const tx = to.x;
      const ty = screenY(to.y, to.z);
      const width = from.radius * forms().look.armWidthRatio;
      const grip = to.radius * outcome.wrapRadiusRatio;
      const toward = Math.atan2(fy0 - ty, fx0 - tx);
      const half = outcome.wrapArcRadians / 2;
      // The line from the grabber to the near side of the rim, then the claw around the far side.
      overlay.moveTo(fx0, fy0).lineTo(tx + Math.cos(toward) * grip, ty + Math.sin(toward) * grip).stroke({ color: accentOf(from), width, alpha, cap: 'round' });
      overlay.arc(tx, ty, grip, toward + Math.PI - half, toward + Math.PI + half).stroke({ color: accentOf(from), width, alpha, cap: 'round' });
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.age += dt;
      const t = ring.age / outcome.ring.seconds;
      if (t >= 1) {
        rings.splice(i, 1);
        continue;
      }
      overlay.circle(ring.x, ring.y, ring.radius * (0.3 + 0.7 * t)).stroke({ color: outcome.ring.color, width: outcome.ring.width, alpha: outcome.ring.alpha * (1 - t) });
    }
  };

  const fragments = (x: number, y: number, count: number, color: string, angle: number, spread: number, radius: number) => {
    const spec = outcomes().fragment;
    if (count <= 0) return;
    emitter.emit(x, y, { count, speedMin: spec.speedMin, speedMax: spec.speedMax, life: spec.life, size: radius * spec.sizeRatio, drag: spec.drag, color, angle, spread }, random.next);
  };

  const snapToRound = (view: RigView) => {
    const round = forms().round;
    view.form.along = round.along;
    view.form.across = round.across;
    view.form.tip = round.tip;
    view.holdFormTime = 0;
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
        emitter.emit(view.x, screenY(view.y, view.z), { count: 18, speedMin: 120, speedMax: 520, life: 0.8, size: 6, drag: 1.8, color, angle: 0, spread: TAU }, random.next);
      }
    },
  };

  const render = (alpha: number, dt: number) => {
    clock += dt;
    const height = fx().height;
    const squashTuning = fx().squash;
    const look = forms().look;
    for (const view of views.values()) {
      const x = lerp(view.prevX, view.x, alpha);
      const y = lerp(view.prevY, view.y, alpha);
      const z = Math.max(0, lerp(view.prevZ, view.z, alpha));

      // Ease the body toward its move's form (held still for a beat after a piercing hit).
      view.holdFormTime = Math.max(0, view.holdFormTime - dt);
      if (view.holdFormTime <= 0) view.formName = formNameOf(view.move);
      const spec = forms().forms[view.formName] ?? forms().forms.default;
      easeForm(view.form, resolveForm(forms(), view.formName), 1 - Math.exp(-dt / Math.max(0.001, spec.easeSeconds)));
      const form = view.form;

      view.angle += ctx.data.brawl.motion.spinDirection * (4 + 30 * view.spinRatio) * form.spinBoost * dt;
      view.wobbleTime += dt;
      view.squash -= squashTuning.recoverPerSecond * view.squash * dt;
      if (Math.abs(view.squash) < 0.002) view.squash = 0;
      view.flashTime = Math.max(0, view.flashTime - dt);
      view.rimFlashTime = Math.max(0, view.rimFlashTime - dt);
      view.wrapTime = Math.max(0, view.wrapTime - dt);
      view.moveAge += dt;
      view.refusedTime = Math.max(0, view.refusedTime - dt);

      const spinWobble = view.toppled ? 0 : (1 - view.spinRatio) * view.radius * 0.18;
      view.root.visible = !view.gone;
      view.shadow.visible = !view.gone;
      // The shadow: shrinks with height, unless the form is a falling weight, whose shadow grows as it comes down.
      const falling = form.shadowScale > 1.05;
      const shadowShrink = Math.max(0.3, 1 - z * height.shadowShrinkPerUnit);
      view.shadow.position.set(x + height.shadowOffset, y + height.shadowOffset);
      view.shadow.scale.set(falling ? Math.max(0.5, 1 - z * look.shadowGrowPerUnit) : shadowShrink);
      view.shadow.alpha = falling ? 0.65 : height.shadowAlpha * Math.max(0.25, shadowShrink);
      drawRigShadow(view.shadow, view.look, form, accentOf(view));

      view.root.position.set(x + Math.cos(view.wobbleTime * 11) * spinWobble, screenY(y, z) + Math.sin(view.wobbleTime * 11) * spinWobble);
      const lift = 1 + z * height.scalePerUnit;
      view.root.scale.set(lift);
      view.squashNode.rotation = view.squashAngle;
      view.squashNode.scale.set(1 - view.squash, 1 + view.squash * 0.6);
      const wobbleRate = view.formName === 'stunnedOpen' ? look.stunnedWobblePerSecond : look.wobblePerSecond;
      const tilt = form.wobble * look.wobbleRadians * Math.sin(view.wobbleTime * wobbleRate);
      view.formNode.rotation = -view.squashAngle + tilt;
      view.formNode.scale.set(form.wide, form.tall * (1 - form.wobble * 0.12));
      view.blades.rotation = view.toppled ? view.blades.rotation : view.angle;
      const dimmed = 1 - form.dim * 0.35;
      view.shape.alpha = view.toppled ? 0.55 : dimmed;
      view.blades.alpha = view.toppled ? 0.55 : dimmed;
      view.flash.alpha = view.flashTime > 0 ? view.flashTime / fx().flashSeconds : 0;

      const aim = Math.atan2(view.aimY, view.aimX);
      drawRigShape(view.shape, view.look, form, look, accentOf(view), aim, view.wrapTime > 0);
      drawRigBlades(view.blades, view.look, form, look);
      drawTells(view);
    }
    drawOverlay(dt);
    emitter.update(dt);
  };

  /** One Rig's side of a landed hit (outcomeFx.json). `angle` points from attacker to defender. */
  const applyEffect = (view: RigView, name: string, angle: number, squash: number, other: RigView | undefined) => {
    const outcome = outcomes();
    switch (name) {
      case 'squash':
        view.squashAngle = angle;
        view.squash = squash;
        break;
      case 'keepForm':
        view.holdFormTime = outcome.holdFormSeconds;
        view.squashAngle = angle;
        view.squash = squash * 0.4;
        break;
      case 'snapTip':
        snapToRound(view);
        view.squashAngle = angle;
        view.squash = squash;
        break;
      case 'snapArm':
        view.form.armExtend = 0;
        view.form.armClose = 0;
        view.squashAngle = angle;
        view.squash = squash;
        break;
      case 'parryFlash':
        view.rimFlashTime = outcome.rimFlashSeconds;
        view.squashAngle = angle;
        view.squash = squash * 0.3;
        break;
      case 'wrap':
        view.wrapTime = fx().tells.tether.seconds;
        if (other) activeTethers.push({ from: viewId(view), to: viewId(other), time: fx().tells.tether.seconds });
        break;
      case 'pull':
        view.squashAngle = angle;
        view.squash = -outcome.pullStretch;
        break;
      case 'crush':
        view.squashAngle = -Math.PI / 2;
        view.squash = squash;
        view.form.splay = Math.max(view.form.splay, 0.6);
        break;
      case 'bounce':
        view.squashAngle = -Math.PI / 2;
        view.squash = -squash * 0.4;
        break;
      case 'retract':
        view.form.armExtend = 0;
        break;
      default:
        break;
    }
  };
  const ids = new Map<RigView, number>();
  const viewId = (view: RigView) => ids.get(view) ?? -1;

  return [
    // A dragged attack button aims live: the form turns with the finger during the wind-up.
    on(SpinnerCommandIssued, 'rig.view.onCommandAim', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(rigOfSpinner(batch.cols.spinnerId[i]));
        if (!view || (batch.cols.aimX[i] === 0 && batch.cols.aimY[i] === 0)) continue;
        view.aimX = batch.cols.aimX[i];
        view.aimY = batch.cols.aimY[i];
      }
    }),
    on(RigReady, 'rig.view.onRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rigId = batch.cols.rigId[i];
        const old = views.get(rigId);
        old?.root.destroy({ children: true });
        old?.shadow.destroy();
        if (old) ids.delete(old);
        const radius = batch.cols.radius[i];
        const look: RigLook = { radius, color: batch.cols.color[i], accentColor: batch.cols.accentColor[i], blades: batch.cols.blades[i] };
        const root = new Container();
        const squashNode = new Container();
        const formNode = new Container();
        const shape = new Graphics();
        const blades = new Graphics();
        const flash = new Graphics().circle(0, 0, radius * 1.1).fill({ color: '#ffffff' });
        flash.alpha = 0;
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
        formNode.addChild(shape, blades, flash);
        squashNode.addChild(formNode);
        root.addChild(tell, squashNode, revLabel);
        const shadow = new Graphics();
        shadows.addChild(shadow);
        rigs.addChild(root);
        const view: RigView = {
          root, squashNode, formNode, shape, blades, flash, shadow, tell, look, radius,
          form: copyForm(ctx.data.rig.rigForms.round), formName: 'default', holdFormTime: 0,
          move: '', moveAge: 0,
          aimX: batch.cols.slot[i] % 2 === 0 ? 1 : -1, aimY: 0, vx: 0, vy: 0, refusedTime: 0, gear: 0, color: batch.cols.color[i], rank: 0, revLabel, charge: 0,
          colors: [batch.cols.color[i], batch.cols.accentColor[i], '#0d0b18'],
          prevX: 0, prevY: 0, prevZ: 0, x: 0, y: 0, z: 0, angle: 0, spinRatio: 1,
          squash: 0, squashAngle: 0, flashTime: 0, rimFlashTime: 0, wrapTime: 0, wobbleTime: 0, gone: false, toppled: false,
        };
        views.set(rigId, view);
        ids.set(view, rigId);
      }
    }),
    on(RoundStarted, 'rig.view.onRoundStarted', () => {
      for (const view of views.values()) {
        view.gone = false;
        view.toppled = false;
        view.spinRatio = 1;
        view.squash = 0;
        view.refusedTime = 0;
        view.holdFormTime = 0;
        view.rimFlashTime = 0;
        view.wrapTime = 0;
        Object.assign(view.form, ctx.data.rig.rigForms.round);
      }
      activeTethers.length = 0;
      rings.length = 0;
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
    // A move's aim (the stick, else where the Rig is heading) orients its form.
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
    // The clash: each hit plays out on the two forms so the player sees why it went that way.
    on(HitLanded, 'rig.view.onHitLanded', (batch) => {
      const outcome = outcomes();
      for (let i = 0; i < batch.count; i++) {
        const defender = views.get(batch.cols.defenderId[i]);
        const attacker = views.get(batch.cols.attackerId[i]);
        const effect = outcome.effects[batch.cols.hit[i]] ?? outcome.effects.default;
        if (debug.hits.length < 200) debug.hits.push(`${batch.cols.hit[i]}:${effect.attacker}/${effect.defender}`);
        const angle = Math.atan2(batch.cols.ny[i], batch.cols.nx[i]);
        if (defender) {
          defender.flashTime = fx().flashSeconds;
          applyEffect(defender, effect.defender, angle, effect.squash, attacker);
        }
        if (attacker) applyEffect(attacker, effect.attacker, angle, effect.squash, defender);
        const color = effect.fragmentColor === 'attacker' ? (attacker?.color ?? '#ffffff') : effect.fragmentColor === 'defender' ? (defender?.color ?? '#ffffff') : effect.fragmentColor;
        const at = defender ?? attacker;
        const fy = at ? screenY(batch.cols.y[i], at.z) : batch.cols.y[i];
        const spread = effect.fragmentsAlong === 'around' ? TAU : outcome.fragment.spread;
        const direction = effect.fragmentsAlong === 'back' ? angle + Math.PI : angle;
        fragments(batch.cols.x[i], fy, effect.fragments, color, direction, spread, at?.radius ?? 20);
        if (effect.ring > 0 && at) rings.push({ x: batch.cols.x[i], y: batch.cols.y[i], age: 0, radius: at.radius * effect.ring });
      }
    }),
    on(Landed, 'rig.view.onLanded', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.rigId[i]);
        if (!view) continue;
        view.squashAngle = -Math.PI / 2;
        view.squash = Math.min(0.45, fx().squash.landAmount * Math.min(1, batch.cols.impactSpeed[i] / 600));
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
