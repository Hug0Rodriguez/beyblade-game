import type { Graphics } from 'pixi.js';
import { TAU } from '@shared/math/scalar';
import type { RigForm, RigFormsData } from '../../../gameData/schema/rigData';

export interface RigLook {
  readonly radius: number;
  readonly color: string;
  readonly accentColor: string;
  readonly blades: number;
}

/** A form that can be eased in place. */
export type MutableForm = { -readonly [K in keyof RigForm]: number };

export function copyForm(from: RigForm): MutableForm {
  return { ...from };
}

/** Moves every parameter of `form` a fraction `t` toward `target`. */
export function easeForm(form: MutableForm, target: RigForm, t: number): void {
  for (const key of Object.keys(form) as (keyof RigForm)[]) form[key] += (target[key] - form[key]) * t;
}

/** Resolves a named form over the round top (only the fields that differ are listed in the data). */
export function resolveForm(data: RigFormsData, name: string): RigForm {
  const spec = data.forms[name] ?? data.forms.default;
  const { easeSeconds: _ease, accent: _accent, trail: _trail, ...fields } = spec;
  return { ...data.round, ...fields };
}

const OUTLINE_POINTS = 32;

/**
 * The body: a disc deformed along the aim (`along`/`across`, pinched to a point by `tip`), a
 * shell rim when `rimWidth` > 0, a dark gap when `splay` > 0, and the claw arm when it extends.
 * Drawn in the Rig's own frame (no spin): the spinning blades are a separate graphics.
 */
export function drawRigShape(g: Graphics, look: RigLook, form: RigForm, data: RigFormsData['look'], accent: string, aim: number, wrapping: boolean): void {
  g.clear();
  const r = look.radius * form.discScale;
  const cos = Math.cos(aim);
  const sin = Math.sin(aim);
  const outline = (scale: number): number[] => {
    const points: number[] = [];
    for (let i = 0; i < OUTLINE_POINTS; i++) {
      const theta = (i / OUTLINE_POINTS) * TAU;
      const c = Math.cos(theta);
      const u = r * scale * form.along * c;
      let v = r * scale * form.across * Math.sin(theta);
      if (c > 0) v *= 1 - form.tip * Math.pow(c, 0.6);
      points.push(u * cos - v * sin, u * sin + v * cos);
    }
    return points;
  };
  // Rim first (the shell), then the body over it.
  if (form.rimWidth > 0.01) g.poly(outline(1)).fill({ color: accent });
  g.poly(outline(form.rimWidth > 0.01 ? 1 - form.rimWidth : 1)).fill({ color: look.color });
  g.poly(outline(1)).stroke({ color: data.outlineColor, width: 2, alpha: 0.6 });
  // The needle's bright point.
  if (form.tip > 0.05) {
    const from = r * form.along * 0.3;
    const to = r * form.along;
    g.moveTo(from * cos, from * sin)
      .lineTo(to * cos, to * sin)
      .stroke({ color: accent, width: look.radius * data.tipWidthRatio * form.tip, alpha: form.tip, cap: 'round' });
  }
  // The open shell: a dark gap facing up.
  if (form.splay > 0.05) {
    const half = data.gapRadians / 2;
    g.moveTo(0, 0)
      .arc(0, 0, r * 1.03, -Math.PI / 2 - half, -Math.PI / 2 + half)
      .closePath()
      .fill({ color: data.outlineColor, alpha: 0.75 * form.splay });
  }
  // The hub.
  g.circle(0, 0, look.radius * 0.42).fill({ color: data.outlineColor });
  g.circle(0, 0, look.radius * 0.18).fill({ color: look.color });
  // The claw: a thin arm out along the aim, open like a hand, or curled shut into a hook.
  if (form.armExtend > 0.02 && !wrapping) {
    const L = form.armExtend * data.armReachRatio * look.radius;
    const k = form.armClose;
    const lerp = (a: number, b: number) => a + (b - a) * k;
    const pts = [
      [look.radius * 0.9, 0],
      [lerp(0.5, 0.9) * L, lerp(-0.1, -0.45) * L],
      [lerp(0.9, 1.15) * L, lerp(-0.25, 0.15) * L],
      [lerp(1.0, 0.72) * L, lerp(-0.3, 0.55) * L],
    ].map(([u, v]) => [u * cos - v * sin, u * sin + v * cos]);
    g.moveTo(pts[0][0], pts[0][1])
      .bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1])
      .stroke({ color: accent, width: look.radius * data.armWidthRatio, cap: 'round', join: 'round' });
    // The barb at the tip.
    const barb = look.radius * 0.35;
    const bu = lerp(1.0, 0.72) * L - lerp(0.9, 1.15) * L;
    const bv = lerp(-0.3, 0.55) * L - lerp(-0.25, 0.15) * L;
    const len = Math.hypot(bu, bv) || 1;
    const nx = -bv / len;
    const ny = bu / len;
    const tipU = lerp(1.0, 0.72) * L;
    const tipV = lerp(-0.3, 0.55) * L;
    const tx = tipU * cos - tipV * sin;
    const ty = tipU * sin + tipV * cos;
    const hx = nx * cos - ny * sin;
    const hy = nx * sin + ny * cos;
    g.moveTo(tx, ty).lineTo(tx + hx * barb, ty + hy * barb).stroke({ color: accent, width: look.radius * data.armWidthRatio * 0.8, cap: 'round' });
  }
}

/** The blades, in the spinning frame: swept hooks that fold away (`bladeFold`) or splay open (`splay`); rim ticks on a shell. */
export function drawRigBlades(g: Graphics, look: RigLook, form: RigForm, data: RigFormsData['look']): void {
  g.clear();
  const r = look.radius;
  if (form.rimWidth > 0.01 && form.bladeFold > 0.5) {
    const outer = r * form.discScale;
    const inner = outer * (1 - form.rimWidth);
    for (let i = 0; i < data.rimTickCount; i++) {
      const a = (i / data.rimTickCount) * TAU;
      g.moveTo(Math.cos(a) * inner, Math.sin(a) * inner).lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    }
    g.stroke({ color: data.outlineColor, width: 2, alpha: 0.5 });
    return;
  }
  const length = 1 - form.bladeFold * 0.95;
  if (length < 0.08) return;
  const offset = form.splay * 0.4 * r;
  for (let blade = 0; blade < look.blades; blade++) {
    const a = (blade / look.blades) * TAU + form.splay * 0.3;
    const sweep = TAU / look.blades / 2.2;
    const root = r * 0.35 + offset;
    const reach = r * (0.35 + 0.73 * length) + offset;
    g.moveTo(Math.cos(a) * root, Math.sin(a) * root)
      .lineTo(Math.cos(a - sweep * 0.4) * reach, Math.sin(a - sweep * 0.4) * reach)
      .arc(0, 0, reach, a - sweep * 0.4, a + sweep * 0.6)
      .lineTo(Math.cos(a + sweep) * (r * 0.5 + offset), Math.sin(a + sweep) * (r * 0.5 + offset))
      .fill({ color: look.accentColor });
  }
}

/** The shadow on the ground: the Rig's disc, or the growing dark disc of a falling weight with a ring in the move's colour. */
export function drawRigShadow(g: Graphics, look: RigLook, form: RigForm, accent: string): void {
  g.clear();
  const r = look.radius * form.shadowScale;
  g.circle(0, 0, r).fill({ color: '#000000' });
  if (form.shadowRing > 0.05) g.circle(0, 0, r).stroke({ color: accent, width: 3, alpha: form.shadowRing * 0.9 });
}
