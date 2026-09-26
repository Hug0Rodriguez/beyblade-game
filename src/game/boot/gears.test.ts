import { describe, expect, it } from 'vitest';
import type { TestWorld } from './testing/createTestWorld';
import { dummyWorld, hold, stepUntilHit, tap } from './testing/dummyWorld';

const keys = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' } as const;

/** Holds the WASD keys closest to the Rig's counter-clockwise tangent, for `steps` steps. */
function rideRimLine(world: TestWorld, steps: number): void {
  for (let i = 0; i < steps; i++) {
    const body = world.rows('RigBodiesMoved').filter((row) => row.rigId === 0).at(-1)!;
    const x = body.x as number;
    const y = body.y as number;
    const r = Math.hypot(x, y) || 1;
    // Tangent, bent slightly inward so the Rig follows the curve of the Rim Line.
    const tx = -y / r - (x / r) * 0.35;
    const ty = x / r - (y / r) * 0.35;
    hold(world, keys.right, tx > 0.38 ? 1 : 0);
    hold(world, keys.left, tx < -0.38 ? 1 : 0);
    hold(world, keys.down, ty > 0.38 ? 1 : 0);
    hold(world, keys.up, ty < -0.38 ? 1 : 0);
    world.step();
  }
}

describe('Gears: speed you build on the Rim Line and spend on attacks', () => {
  it('cruising on the stick is Gear 1; riding the Rim Line builds Gear 3', () => {
    const world = dummyWorld((data) => {
      data.round.countdown.slots[1] = { x: 0.05, y: 0.05 };
    }, 0.68);
    hold(world, keys.up, 1);
    world.step(30);
    const cruising = world.rows('GearChanged').filter((row) => row.rigId === 0).at(-1);
    expect(cruising?.gear).toBe(1);
    rideRimLine(world, 300);
    expect(world.rows('GearChanged').some((row) => row.rigId === 0 && row.gear === 3)).toBe(true);
  });

  it('a Dash from cruising lands at Gear 2 and spends the speed', () => {
    const world = dummyWorld(() => {}, 0.25);
    hold(world, keys.right, 1);
    world.step(6);
    tap(world, 'KeyJ');
    const hit = stepUntilHit(world)[0];
    expect(hit).toMatchObject({ hit: 'strike', gear: 2 });
    hold(world, keys.right, 0);
    world.step(2);
    const gears = world.rows('GearChanged').filter((row) => row.rigId === 0);
    expect(gears.at(-1)!.gear as number).toBeLessThanOrEqual(1);
  });
});
