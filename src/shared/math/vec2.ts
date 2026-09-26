export interface Vec2 {
  x: number;
  y: number;
}

export function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

/** Writes the unit vector of (x, y) into `out` and returns the original length (0 → out = 0,0). */
export function normalizeInto(out: Vec2, x: number, y: number): number {
  const len = length(x, y);
  if (len === 0) {
    out.x = 0;
    out.y = 0;
    return 0;
  }
  out.x = x / len;
  out.y = y / len;
  return len;
}

/** Clamps (x, y) to a maximum length, writing into `out`. */
export function clampLengthInto(out: Vec2, x: number, y: number, maxLength: number): void {
  const len = length(x, y);
  const scale = len > maxLength && len > 0 ? maxLength / len : 1;
  out.x = x * scale;
  out.y = y * scale;
}

export function rotateInto(out: Vec2, x: number, y: number, radians: number): void {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  out.x = x * c - y * s;
  out.y = x * s + y * c;
}
