import { describe, expect, it } from 'vitest';
import { dummyWorld, hold, rivalPress, stepUntilHit, tap } from './testing/dummyWorld';

describe('style, headless', () => {
  it('winning a read earns Rev (with a callout reason); the loser is told it was COUNTERED', () => {
    const world = dummyWorld();
    rivalPress(world, 'whirl');
    hold(world, 'KeyD', 1);
    tap(world, 'KeyI');
    stepUntilHit(world);
    world.step();
    expect(world.rows('RevGained').some((row) => row.rigId === 0 && row.reason === 'sling' && (row.amount as number) > 0)).toBe(true);
    expect(world.rows('RevGained').some((row) => row.rigId === 1 && row.reason === 'countered')).toBe(true);
    const human = world.rows('RevChanged').filter((row) => row.rigId === 0).at(-1)!;
    expect(human.points as number).toBeGreaterThan(0);
  });

  it('winning a read pays more Rev than a plain Strike', () => {
    const gains = dummyWorld().data.style.revGains.hits;
    for (const read of ['deflect', 'interrupt', 'sling', 'punish']) expect(gains[read]).toBeGreaterThan(gains.strike * 2);
  });

  it('Dash + Whirl does not Shatter until the Rank and the rival allow it', () => {
    const world = dummyWorld();
    tap(world, 'KeyJ', 'KeyL');
    world.step(2);
    expect(world.rows('MoveStarted').map((row) => row.move)).not.toContain('shatter');
  });

  it('when ready, Dash + Whirl Shatters the rival for a 3-point Finish', () => {
    const world = dummyWorld((data) => {
      data.style.revRanks.shatterRank = 0;
      data.style.revRules.shatterRivalSpinRatio = 1.1;
      data.style.revRules.shatterChargeSeconds = 0;
    });
    world.step(2);
    tap(world, 'KeyJ', 'KeyL');
    world.step(20);
    expect(world.rows('MoveStarted').map((row) => row.move)).toContain('shatter');
    expect(world.rows('RoundFinished')[0]).toMatchObject({ loserRigId: 1, finish: 'shatter', points: 3 });
    // The Shatter cashes in all of the attacker's Rev.
    const human = world.rows('RevChanged').filter((row) => row.rigId === 0).at(-1)!;
    expect(human.points as number).toBe(0);
  });
});

describe('the Shatter charges at ZENITH', () => {
  it('is not ready until the Rank has been held for shatterChargeSeconds', () => {
    const world = dummyWorld((data) => {
      data.style.revRanks.shatterRank = 0;
      data.style.revRules.shatterRivalSpinRatio = 1.1;
      data.style.revRules.shatterChargeSeconds = 1;
    });
    const readyAt = () => world.rows('ShatterReady').find((row) => row.rigId === 0 && row.ready === 1);
    world.step(60);
    expect(readyAt()).toBeUndefined();
    world.step(90);
    expect(readyAt()).toBeDefined();
    expect(world.rows('ShatterCharging').some((row) => row.rigId === 0 && (row.progress as number) > 0 && (row.progress as number) < 1)).toBe(true);
  });
});
