export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Wraps an angle into (-PI, PI]. */
export function wrapAngle(angle: number): number {
  let wrapped = (angle + Math.PI) % TAU;
  if (wrapped < 0) wrapped += TAU;
  return wrapped - Math.PI;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Gaussian-shaped bump: 1 at distance 0, ~0.37 at distance = width. */
export function bump(distance: number, width: number): number {
  const t = distance / width;
  return Math.exp(-t * t);
}

/** 0 → 1 → 0 over one period. */
export function triangleWave(time: number, period: number): number {
  const phase = (time / period) % 1;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}
