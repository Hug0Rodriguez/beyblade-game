import { Graphics } from 'pixi.js';

export interface RibbonTrailStyle {
  readonly length: number;
  readonly width: number;
  readonly color: string;
  readonly alpha: number;
}

export interface RibbonTrail {
  readonly view: Graphics;
  push(x: number, y: number): void;
  reset(): void;
  redraw(style: RibbonTrailStyle): void;
}

/** Ring buffer of recent points drawn as a tapering, fading line. */
export function createRibbonTrail(capacity: number): RibbonTrail {
  const view = new Graphics();
  const xs = new Float64Array(capacity);
  const ys = new Float64Array(capacity);
  let head = 0;
  let size = 0;

  return {
    view,
    push(x, y) {
      xs[head] = x;
      ys[head] = y;
      head = (head + 1) % capacity;
      size = Math.min(size + 1, capacity);
    },
    reset() {
      size = 0;
      view.clear();
    },
    redraw(style) {
      view.clear();
      const count = Math.min(size, style.length, capacity);
      for (let n = 1; n < count; n++) {
        const a = (head - n + capacity) % capacity;
        const b = (head - n - 1 + capacity) % capacity;
        const t = 1 - n / count;
        view
          .moveTo(xs[a], ys[a])
          .lineTo(xs[b], ys[b])
          .stroke({ width: style.width * t, color: style.color, alpha: style.alpha * t, cap: 'round' });
      }
    },
  };
}
