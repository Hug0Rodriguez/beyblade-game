import { describe, expect, it } from 'vitest';
import { dummyWorld, hold, movesOf, rivalPress, stepUntilHit, tap } from './testing/dummyWorld';

describe('the moveset, headless (human vs an idle dummy)', () => {
  it('a Dash from a standstill is only a short poke', () => {
    const world = dummyWorld(() => {}, 0.25);
    tap(world, 'KeyJ');
    world.step(60);
    expect(world.rows('HitLanded')).toHaveLength(0);
  });

  it('Dash into the rival Strikes it; the attacker ricochets away, having spent most of its speed', () => {
    const world = dummyWorld(() => {}, 0.25);
    // Cruise at Gear 1, Dash, and let go of the stick the moment the hit lands.
    hold(world, 'KeyD', 1);
    world.step(6);
    tap(world, 'KeyJ');
    let steps = 0;
    while (!world.rows('HitLanded').length && steps++ < 60) world.step();
    hold(world, 'KeyD', 0);
    world.step(3);
    expect(world.rows('HitLanded')[0]).toMatchObject({ hit: 'strike', attackerId: 0, defenderId: 1 });
    const afterHit = world.rows('RigBodiesMoved').filter((row) => row.rigId === 0).at(-1)!;
    expect(afterHit.vx as number).toBeLessThan(0);
    const hit = world.rows('HitLanded')[0];
    expect(Math.hypot(afterHit.vx as number, afterHit.vy as number)).toBeLessThan((hit.speed as number) * 0.5);
  });

  it('a Dash into a Whirl launches the rammer; it can Break Out (paying Spin) and lands back on the ground', () => {
    const world = dummyWorld(() => {}, 0.25);
    rivalPress(world, 'whirl');
    hold(world, 'KeyD', 1);
    tap(world, 'KeyJ');
    stepUntilHit(world);
    world.step(2);
    expect(movesOf(world, 0)).toContain('launched');
    tap(world, 'KeyK');
    world.step(160);
    expect(movesOf(world, 0)).toEqual(expect.arrayContaining(['launched', 'breakOut', 'ground']));
    expect(world.rows('MoveStarted').some((row) => row.rigId === 0 && row.move === 'breakOut')).toBe(true);
  });

  it('Pop then Pop again Dives; landing returns to the ground state', () => {
    const world = dummyWorld();
    tap(world, 'KeyK');
    world.step(20);
    tap(world, 'KeyK');
    world.step(60);
    expect(movesOf(world, 0)).toEqual(expect.arrayContaining(['pop', 'dive', 'ground']));
  });
});

describe('air moves fall back to the airborne state without a new hop', () => {
  it('an Air Dash that times out does not Pop the Rig higher', () => {
    const world = dummyWorld(() => {}, 0.6);
    tap(world, 'KeyK');
    world.step(10);
    tap(world, 'KeyJ');
    world.step(80);
    const peak = Math.max(...world.rows('RigBodiesMoved').filter((row) => row.rigId === 0).map((row) => row.z as number));
    expect(movesOf(world, 0)).toEqual(expect.arrayContaining(['pop', 'airDash']));
    expect(world.rows('MoveStarted').filter((row) => row.rigId === 0 && row.move === 'pop')).toHaveLength(1);
    expect(peak).toBeLessThan(world.data.moves.moveTuning.moves.pop.vz! ** 2 / (2 * world.data.brawl.motion.gravity) + 5);
  });
});
