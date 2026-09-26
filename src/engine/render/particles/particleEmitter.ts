import { Container, Sprite, Texture } from 'pixi.js';

export interface ParticleBurst {
  readonly count: number;
  readonly speedMin: number;
  readonly speedMax: number;
  readonly life: number;
  readonly size: number;
  readonly color: string;
  /** Direction in radians and spread around it (TAU = all around). */
  readonly angle: number;
  readonly spread: number;
  readonly drag: number;
}

export interface ParticleEmitter {
  readonly view: Container;
  emit(x: number, y: number, burst: ParticleBurst, random: () => number): void;
  update(dt: number): void;
}

/** Fixed pool of tinted square sprites stored as parallel arrays. */
export function createParticleEmitter(capacity: number): ParticleEmitter {
  const view = new Container();
  const x = new Float64Array(capacity);
  const y = new Float64Array(capacity);
  const vx = new Float64Array(capacity);
  const vy = new Float64Array(capacity);
  const life = new Float64Array(capacity);
  const maxLife = new Float64Array(capacity);
  const drag = new Float64Array(capacity);
  const size = new Float64Array(capacity);
  const sprites: Sprite[] = [];
  for (let i = 0; i < capacity; i++) {
    const sprite = new Sprite(Texture.WHITE);
    sprite.anchor.set(0.5);
    sprite.visible = false;
    sprites.push(sprite);
    view.addChild(sprite);
  }
  let cursor = 0;

  return {
    view,
    emit(px, py, burst, random) {
      for (let n = 0; n < burst.count; n++) {
        const i = cursor;
        cursor = (cursor + 1) % capacity;
        const angle = burst.angle + (random() - 0.5) * burst.spread;
        const speed = burst.speedMin + (burst.speedMax - burst.speedMin) * random();
        x[i] = px;
        y[i] = py;
        vx[i] = Math.cos(angle) * speed;
        vy[i] = Math.sin(angle) * speed;
        life[i] = maxLife[i] = burst.life * (0.6 + 0.4 * random());
        drag[i] = burst.drag;
        size[i] = burst.size * (0.6 + 0.8 * random());
        sprites[i].tint = burst.color;
        sprites[i].visible = true;
      }
    },
    update(dt) {
      for (let i = 0; i < capacity; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        const sprite = sprites[i];
        if (life[i] <= 0) {
          sprite.visible = false;
          continue;
        }
        const damping = Math.exp(-drag[i] * dt);
        vx[i] *= damping;
        vy[i] *= damping;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
        const t = life[i] / maxLife[i];
        sprite.position.set(x[i], y[i]);
        sprite.width = sprite.height = size[i] * (0.4 + 0.6 * t);
        sprite.alpha = t;
        sprite.rotation = Math.atan2(vy[i], vx[i]);
      }
    },
  };
}
