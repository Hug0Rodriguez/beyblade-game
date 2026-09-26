import type { Container } from 'pixi.js';

export interface CameraTuning {
  /** Fraction of the gap to the target closed per second (exponential follow). */
  readonly followRate: number;
  readonly zoomRate: number;
}

export interface Camera {
  /** Where to look (world units) and how much to magnify. */
  setTarget(x: number, y: number, zoom: number): void;
  /** Adds a momentary zoom on top of the target (decays at zoomRate). */
  punch(extraZoom: number): void;
  /** Jumps straight to the target (no easing). */
  snap(): void;
  update(dt: number, tuning: CameraTuning): void;
}

/** Smooth follow + zoom applied to `target` (a container that holds the world layers). */
export function createCamera(target: Container): Camera {
  let x = 0;
  let y = 0;
  let zoom = 1;
  let targetX = 0;
  let targetY = 0;
  let targetZoom = 1;
  let punchZoom = 0;

  const apply = () => {
    const shown = zoom + punchZoom;
    target.scale.set(shown);
    target.position.set(-x * shown, -y * shown);
  };

  return {
    setTarget(nextX, nextY, nextZoom) {
      targetX = nextX;
      targetY = nextY;
      targetZoom = nextZoom;
    },
    punch(extraZoom) {
      punchZoom = Math.max(punchZoom, extraZoom);
    },
    snap() {
      x = targetX;
      y = targetY;
      zoom = targetZoom;
      apply();
    },
    update(dt, tuning) {
      const follow = 1 - Math.exp(-tuning.followRate * dt);
      const zoomStep = 1 - Math.exp(-tuning.zoomRate * dt);
      x += (targetX - x) * follow;
      y += (targetY - y) * follow;
      zoom += (targetZoom - zoom) * zoomStep;
      punchZoom -= punchZoom * zoomStep;
      apply();
    },
  };
}
