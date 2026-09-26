import { describe, expect, it } from 'vitest';
import { dummyWorld, hold, movesOf, rivalPress, stepUntilHit, tap } from './testing/dummyWorld';

/** The human (Rig 0, left) against a dummy (Rig 1, right) that only moves when scripted. */
describe('the triangle, headless: DASH › HOOK › WHIRL › DASH', () => {
  it('WHIRL beats DASH: the rammer is COUNTERED (launched) and the Whirler takes its speed', () => {
    const world = dummyWorld(() => {}, 0.25);
    rivalPress(world, 'whirl');
    hold(world, 'KeyD', 1);
    tap(world, 'KeyJ');
    const hits = stepUntilHit(world);
    world.step(2);
    expect(hits[0]).toMatchObject({ hit: 'deflect', attackerId: 1, defenderId: 0 });
    expect(movesOf(world, 0)).toContain('launched');
    const whirler = world.rows('RigBodiesMoved').filter((row) => row.rigId === 1).at(-1)!;
    expect(Math.hypot(whirler.vx as number, whirler.vy as number)).toBeGreaterThan(300);
  });

  it('HOOK beats WHIRL: the Bracing Rig is SLUNG where the Hook aims', () => {
    const world = dummyWorld();
    rivalPress(world, 'whirl');
    hold(world, 'KeyD', 1);
    tap(world, 'KeyI'); // grab toward the rival…
    hold(world, 'KeyD', 0);
    hold(world, 'KeyS', 1); // …and sling it down
    const hits = stepUntilHit(world);
    world.step();
    expect(hits[0]).toMatchObject({ hit: 'sling', attackerId: 0, defenderId: 1 });
    const slung = world.rows('RigBodiesMoved').filter((row) => row.rigId === 1).at(-1)!;
    expect(slung.vy as number).toBeGreaterThan(300); // aimed down the stick (S = +y)
  });

  it('DASH beats HOOK: a Dash into the reach INTERRUPTS it and launches the Hooker', () => {
    const world = dummyWorld(() => {}, 0.22);
    rivalPress(world, 'hook');
    hold(world, 'KeyD', 1);
    tap(world, 'KeyJ');
    const hits = stepUntilHit(world);
    world.step(2);
    expect(hits[0]).toMatchObject({ hit: 'interrupt', attackerId: 0, defenderId: 1 });
    expect(movesOf(world, 1)).toContain('launched');
  });

  it('a Whirl against a Rig that is only steering does nothing, and pressing while committed is refused', () => {
    const world = dummyWorld();
    tap(world, 'KeyL');
    tap(world, 'KeyJ');
    world.step(100);
    expect(world.rows('HitLanded')).toHaveLength(0);
    expect(world.rows('MoveRefused').some((row) => row.rigId === 0 && row.button === 'dash')).toBe(true);
    expect(movesOf(world, 0)).toEqual(['whirl', 'whirlRecover', 'ground']);
  });

  it('every move commits: Dash is rev-up → dash → recovery, and a landed hit cancels the recovery', () => {
    const whiff = dummyWorld(() => {}, 0.6);
    hold(whiff, 'KeyA', 1);
    tap(whiff, 'KeyJ');
    whiff.step(80);
    expect(movesOf(whiff, 0)).toEqual(['dashRevUp', 'dash', 'dashRecover', 'ground']);

    const hit = dummyWorld(() => {}, 0.25);
    hold(hit, 'KeyD', 1);
    tap(hit, 'KeyJ');
    stepUntilHit(hit);
    hit.step(2);
    expect(movesOf(hit, 0)).toEqual(['dashRevUp', 'dash', 'ground']);
  });
});

describe('the Punisher and the air game, headless', () => {
  it('HOOK in the air SPIKES an airborne rival into the ground', () => {
    const world = dummyWorld();
    rivalPress(world, 'pop');
    tap(world, 'KeyK');
    world.step(6);
    tap(world, 'KeyI');
    const hits = stepUntilHit(world, 40);
    expect(hits[0]).toMatchObject({ hit: 'spike', attackerId: 0, defenderId: 1 });
  });

  it('a grounded DASH knocks a landing rival OUT OF THE AIR', () => {
    const world = dummyWorld(() => {}, 0.25);
    rivalPress(world, 'pop');
    world.step(44);
    hold(world, 'KeyD', 1);
    tap(world, 'KeyJ');
    const hits = stepUntilHit(world, 60);
    expect(hits[0]).toMatchObject({ hit: 'outOfTheAir', attackerId: 0, defenderId: 1 });
  });

  it('DIVE on a recovering rival is a PUNISH; on a free rival it is only a SLAM', () => {
    // The rival whiffs a Hook; the Dive lands while it is recovering (vulnerable).
    const punished = dummyWorld();
    rivalPress(punished, 'hook', 0, -1);
    punished.step(38);
    hold(punished, 'KeyD', 1);
    tap(punished, 'KeyK');
    punished.step(12);
    tap(punished, 'KeyK');
    const hits = stepUntilHit(punished, 90);
    expect(hits.map((row) => row.hit)).toContain('punish');

    const free = dummyWorld();
    hold(free, 'KeyD', 1);
    tap(free, 'KeyK');
    free.step(12);
    tap(free, 'KeyK');
    expect(stepUntilHit(free, 90).map((row) => row.hit)).toContain('slam');
  });
});
