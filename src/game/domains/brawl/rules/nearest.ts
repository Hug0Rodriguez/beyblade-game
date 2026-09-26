import type { Vec2 } from '@shared/math/vec2';
import type { BodyTable } from '../state/brawlState';

/** Direction from body `row` to the nearest other body, into `out`. Returns false (out unchanged) when alone. */
export function towardNearest(bodies: BodyTable, row: number, out: Vec2): boolean {
  const b = bodies.cols;
  let best = Infinity;
  for (let other = 0; other < bodies.count; other++) {
    if (other === row) continue;
    const dx = b.x[other] - b.x[row];
    const dy = b.y[other] - b.y[row];
    const distance = Math.hypot(dx, dy);
    if (distance < best && distance > 0) {
      best = distance;
      out.x = dx / distance;
      out.y = dy / distance;
    }
  }
  return best < Infinity;
}

/** Turns velocity `v` toward direction (dirX, dirY) by at most `maxTurn` radians, keeping its speed. */
export function turnToward(v: Vec2, dirX: number, dirY: number, maxTurn: number): void {
  const speed = Math.hypot(v.x, v.y);
  if (speed < 1e-6) return;
  const angle = Math.atan2(v.x * dirY - v.y * dirX, v.x * dirX + v.y * dirY) ;
  const turn = Math.max(-maxTurn, Math.min(maxTurn, angle));
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const x = v.x * cos - v.y * sin;
  v.y = v.x * sin + v.y * cos;
  v.x = x;
}
