import { describe, expect, it } from 'vitest';
import { steerGround } from './steerMotion';

const tuning = {
  baseAccel: 3600,
  baseDecel: 3000,
  surplusTurnRate: 7,
  surplusTurnPenaltyPerSpeed: 0.004,
  surplusFadePerSecond: 1.3,
  surplusIdleFadePerSecond: 3.2,
};
const dt = 1 / 120;

function run(v: { x: number; y: number }, steerX: number, steerY: number, seconds: number, baseSpeed = 260) {
  for (let t = 0; t < seconds; t += dt) steerGround(v, steerX, steerY, baseSpeed, tuning, dt);
  return v;
}

describe('grounded motion (base band + surplus momentum)', () => {
  it('reaches base speed from rest within 100 ms (tight, character-like)', () => {
    const v = run({ x: 0, y: 0 }, 1, 0, 0.1);
    expect(v.x).toBeCloseTo(260, 5);
  });

  it('stops within 100 ms when the stick is released in the base band', () => {
    const v = run({ x: 260, y: 0 }, 0, 0, 0.1);
    expect(Math.hypot(v.x, v.y)).toBeLessThan(1);
  });

  it('reverses direction instantly-ish in the base band', () => {
    const v = run({ x: 260, y: 0 }, -1, 0, 0.2);
    expect(v.x).toBeCloseTo(-260, 5);
  });

  it('keeps surplus speed for a while and fades it toward base', () => {
    const v = run({ x: 700, y: 0 }, 1, 0, 0.25);
    const speed = Math.hypot(v.x, v.y);
    expect(speed).toBeGreaterThan(500);
    expect(speed).toBeLessThan(700);
    run(v, 1, 0, 6);
    expect(Math.hypot(v.x, v.y)).toBeLessThan(261);
  });

  it('turns surplus momentum slower than the base band turns', () => {
    const fast = run({ x: 800, y: 0 }, 0, 1, 0.1);
    const slow = run({ x: 200, y: 0 }, 0, 1, 0.1);
    const fastAngle = Math.atan2(fast.y, fast.x);
    const slowAngle = Math.atan2(slow.y, slow.x);
    expect(fastAngle).toBeLessThan(slowAngle);
    expect(fastAngle).toBeGreaterThan(0);
  });
});
