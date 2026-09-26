import { Graphics } from 'pixi.js';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { degreesToRadians, TAU } from '@shared/math/scalar';
import type { ViewContext } from '../../../shared/domainContext';
import { selectedDish } from '../../../shared/dataLookups';
import { RigBodiesMoved } from '../../../messages/brawlMessages';
import { ridesRimLine } from '../rules/dishGeometry';

function mixColor(from: string, to: string, t: number): number {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/**
 * Bowl shading, a neon grid, the Rim with hazard-striped Lip gaps (drawn once from dish data),
 * and the Rim Line band, which brightens while any Rig rides it.
 */
export function dishViewHandlers(ctx: ViewContext): HandlerDef[] {
  const dish = selectedDish(ctx.data);
  const look = dish.look;
  const r = dish.radius;
  const g = new Graphics();

  // Lip gaps: striped pockets beyond the Rim.
  for (const gap of dish.lipGaps) {
    const center = degreesToRadians(gap.angleDegrees);
    const half = degreesToRadians(gap.widthDegrees) / 2;
    const outer = r + look.lipDepth;
    g.moveTo(Math.cos(center - half) * r, Math.sin(center - half) * r)
      .arc(0, 0, outer, center - half, center + half)
      .lineTo(Math.cos(center + half) * r, Math.sin(center + half) * r)
      .fill({ color: look.lipColor });
    const stripes = 5;
    for (let s = 0; s < stripes; s++) {
      const a = center - half + ((s + 0.5) / stripes) * half * 2;
      g.moveTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2))
        .lineTo(Math.cos(a) * (outer - 2), Math.sin(a) * (outer - 2))
        .stroke({ color: look.lipStripeColor, width: 3 });
    }
  }

  for (let ring = look.floorRings; ring >= 1; ring--) {
    const t = ring / look.floorRings;
    g.circle(0, 0, r * t).fill({ color: mixColor(look.floorCenter, look.floorEdge, t) });
  }
  for (let ring = 1; ring <= look.gridRings; ring++) {
    g.circle(0, 0, (r * ring) / (look.gridRings + 1)).stroke({ color: look.gridColor, alpha: look.gridAlpha, width: 2 });
  }
  for (let spoke = 0; spoke < look.gridSpokes; spoke++) {
    const a = (spoke / look.gridSpokes) * TAU;
    g.moveTo(Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12)
      .lineTo(Math.cos(a) * r, Math.sin(a) * r)
      .stroke({ color: look.gridColor, alpha: look.gridAlpha, width: 2 });
  }
  g.circle(0, 0, r * 0.08).stroke({ color: look.centerMarkColor, alpha: look.centerMarkAlpha, width: 3 });

  // Rim: arcs between the Lip gaps.
  const openings = dish.lipGaps
    .map((gap) => ({
      start: degreesToRadians(gap.angleDegrees - gap.widthDegrees / 2),
      end: degreesToRadians(gap.angleDegrees + gap.widthDegrees / 2),
    }))
    .sort((a, b) => a.start - b.start);
  if (openings.length === 0) g.circle(0, 0, r + look.rimWidth / 2).stroke({ color: look.rimColor, width: look.rimWidth });
  openings.forEach((opening, index) => {
    const next = openings[(index + 1) % openings.length];
    const nextStart = index === openings.length - 1 ? next.start + TAU : next.start;
    g.moveTo(Math.cos(opening.end) * (r + look.rimWidth / 2), Math.sin(opening.end) * (r + look.rimWidth / 2))
      .arc(0, 0, r + look.rimWidth / 2, opening.end, nextStart)
      .stroke({ color: look.rimColor, width: look.rimWidth, cap: 'round' });
  });

  const line = dish.rimLine;
  const band = new Graphics()
    .circle(0, 0, (r * (line.innerRatio + line.outerRatio)) / 2)
    .stroke({ color: look.rimLineColor, width: r * (line.outerRatio - line.innerRatio), alpha: 1 });
  band.alpha = look.rimLineAlpha;
  const riding = new Set<number>();

  ctx.screens.layer('dish').addChild(g, band);
  return [
    on(RigBodiesMoved, 'dish.view.onBodiesMoved', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const on = batch.cols.airborne[i] === 0 && ridesRimLine(dish, batch.cols.x[i], batch.cols.y[i], batch.cols.vx[i], batch.cols.vy[i]);
        if (on) riding.add(batch.cols.rigId[i]);
        else riding.delete(batch.cols.rigId[i]);
      }
      band.alpha = riding.size > 0 ? look.rimLineRidingAlpha : look.rimLineAlpha;
    }),
  ];
}
