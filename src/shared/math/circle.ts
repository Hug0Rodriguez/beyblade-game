import { length } from './vec2';

/** Overlap depth of two circles (positive when overlapping). */
export function circlePenetration(
  ax: number,
  ay: number,
  aRadius: number,
  bx: number,
  by: number,
  bRadius: number,
): number {
  return aRadius + bRadius - length(bx - ax, by - ay);
}
