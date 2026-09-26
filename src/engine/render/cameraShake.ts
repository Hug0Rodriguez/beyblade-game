import type { Container } from 'pixi.js';

export interface CameraShakeTuning {
  readonly decayPerSecond: number;
  readonly frequency: number;
  readonly maxOffset: number;
}

export interface CameraShake {
  kick(strength: number): void;
  update(dt: number, tuning: CameraShakeTuning): void;
}

/** Trauma-style shake applied as an offset on `target`. */
export function createCameraShake(target: Container): CameraShake {
  let trauma = 0;
  let time = 0;
  return {
    kick(strength) {
      trauma = Math.min(1, trauma + strength);
    },
    update(dt, tuning) {
      time += dt;
      trauma = Math.max(0, trauma - tuning.decayPerSecond * dt);
      const amount = trauma * trauma * tuning.maxOffset;
      target.position.set(
        Math.sin(time * tuning.frequency * 1.3) * amount,
        Math.cos(time * tuning.frequency * 1.7) * amount,
      );
    },
  };
}
