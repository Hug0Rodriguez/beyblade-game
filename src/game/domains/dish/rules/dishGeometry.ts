import { degreesToRadians, wrapAngle } from '@shared/math/scalar';
import type { Vec2 } from '@shared/math/vec2';
import type { DishDefinition } from '../../../gameData/schema/dishData';

/** Downhill pull toward the centre for a grounded Rig (proportional to distance). */
export function bowlAccel(out: Vec2, dish: DishDefinition, x: number, y: number): Vec2 {
  out.x = -(x / dish.radius) * dish.bowlAccel;
  out.y = -(y / dish.radius) * dish.bowlAccel;
  return out;
}

/** Whether a grounded Rig at (x, y) moving at (vx, vy) is riding the Rim Line. */
export function ridesRimLine(dish: DishDefinition, x: number, y: number, vx: number, vy: number): boolean {
  const ratio = Math.hypot(x, y) / dish.radius;
  const line = dish.rimLine;
  return ratio >= line.innerRatio && ratio <= line.outerRatio && Math.hypot(vx, vy) >= line.minSpeed;
}

/**
 * The Rim Line's push: along the Dish's tangent, in whichever direction the Rig is already
 * going around (added to `out`). Zero off the line.
 */
export function rimLineAccel(out: Vec2, dish: DishDefinition, x: number, y: number, vx: number, vy: number): Vec2 {
  if (!ridesRimLine(dish, x, y, vx, vy)) return out;
  const distance = Math.hypot(x, y);
  const tangentX = -y / distance;
  const tangentY = x / distance;
  const around = Math.sign(vx * tangentX + vy * tangentY) || 1;
  out.x += tangentX * around * dish.rimLine.accel;
  out.y += tangentY * around * dish.rimLine.accel;
  return out;
}

/** Whether the direction from the centre to (x, y) passes through a Lip gap. */
export function facesLipGap(dish: DishDefinition, x: number, y: number): boolean {
  const angle = Math.atan2(y, x);
  return dish.lipGaps.some((gap) => Math.abs(wrapAngle(angle - degreesToRadians(gap.angleDegrees))) <= degreesToRadians(gap.widthDegrees) / 2);
}

export type RimContact = 'inside' | 'wall' | 'spill' | 'leaving';

/**
 * Where a Rig is relative to the Rim. Grounded or low Rigs hit the wall unless they face a
 * Lip gap; Rigs above rimHeight clear it. Past `spillExitRatio` radii beyond the Rim = spilled.
 */
export function rimContact(dish: DishDefinition, x: number, y: number, z: number, radius: number): RimContact {
  const distance = Math.hypot(x, y);
  if (distance + radius <= dish.radius) return 'inside';
  const open = facesLipGap(dish, x, y) || z > dish.rimHeight;
  if (!open) return 'wall';
  return distance > dish.radius + radius * dish.spillExitRatio ? 'spill' : 'leaving';
}
