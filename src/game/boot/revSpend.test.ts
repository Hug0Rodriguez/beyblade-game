import { describe, expect, it } from 'vitest';
import type { TestWorld } from './testing/createTestWorld';
import { dummyWorld, hold, movesOf, rivalPress, stepUntilHit, tap } from './testing/dummyWorld';

/** The Rig's Rank as of the last RevChanged (the tests don't clear the log, so it's always there). */
const lastRank = (world: TestWorld, rig: number) => world.rows('RevChanged').filter((row) => row.rigId === rig).at(-1)?.rank as number;

/** Wins a read (Hook slings the idle dummy) so the human has Rev to spend. */
function earnRev(world: TestWorld): void {
  hold(world, 'KeyD', 1);
  tap(world, 'KeyI');
  stepUntilHit(world);
  hold(world, 'KeyD', 0);
  world.step(60);
}

/** Dashes away from the dummy (a whiff) and steps until the Rig is recovering. */
function whiffIntoRecovery(world: TestWorld): void {
  hold(world, 'KeyA', 1);
  tap(world, 'KeyJ');
  for (let i = 0; i < 90 && !movesOf(world, 0).includes('dashRecover'); i++) world.step();
  hold(world, 'KeyA', 0);
}

describe('Rev spends, headless', () => {
  it('REV CANCEL: the Dash + Whirl chord during recovery at Steady or higher spends a Rank and frees the Rig', () => {
    const world = dummyWorld();
    earnRev(world);
    const before = lastRank(world, 0);
    expect(before).toBeGreaterThanOrEqual(1);
    whiffIntoRecovery(world);
    tap(world, 'KeyJ', 'KeyL');
    world.step(2);
    expect(world.rows('RevCancelled').at(-1)).toMatchObject({ rigId: 0, fromState: 'dashRecover', move: 'ground' });
    expect(movesOf(world, 0).slice(-2)).toEqual(['dashRecover', 'ground']);
    // Free to act at once: the next press starts a move.
    tap(world, 'KeyL');
    expect(movesOf(world, 0).at(-1)).toBe('whirl');
    expect(lastRank(world, 0)).toBe(before - 1);
    expect(world.rows('RevGained').some((row) => row.rigId === 0 && row.reason === 'revCancel')).toBe(true);
  });

  it('a single button during recovery never spends Rev (mashing is refused)', () => {
    const world = dummyWorld();
    earnRev(world);
    whiffIntoRecovery(world);
    tap(world, 'KeyL');
    world.step(2);
    expect(world.rows('RevCancelled')).toHaveLength(0);
    expect(world.rows('MoveRefused').some((row) => row.rigId === 0)).toBe(true);
  });

  it('at Wobble the chord is refused: nothing to spend', () => {
    const world = dummyWorld();
    whiffIntoRecovery(world);
    tap(world, 'KeyJ', 'KeyL');
    world.step(2);
    expect(world.rows('RevCancelled')).toHaveLength(0);
    expect(world.rows('MoveRefused').some((row) => row.rigId === 0)).toBe(true);
  });

  it('REV BREAK: launched at Steady or higher, the Break Out costs a Rank instead of Spin', () => {
    // Steady at 1 Rev, so the speed Rev from the Dash itself is enough to have a Rank to spend.
    const world = dummyWorld((data) => {
      data.style.revRanks.ranks[1].threshold = 1;
    }, 0.25);
    // Dash into the dummy's Whirl: COUNTERED, launched.
    rivalPress(world, 'whirl');
    hold(world, 'KeyD', 1);
    tap(world, 'KeyJ');
    stepUntilHit(world);
    hold(world, 'KeyD', 0);
    world.step(3);
    expect(movesOf(world, 0)).toContain('launched');
    const rank = lastRank(world, 0);
    expect(rank).toBeGreaterThanOrEqual(1);
    const spinBefore = world.rows('RigSpinChanged').filter((row) => row.rigId === 0).at(-1)!.spin as number;
    tap(world, 'KeyK');
    world.step();
    expect(world.rows('MoveStarted').some((row) => row.rigId === 0 && row.move === 'revBreakOut')).toBe(true);
    expect(lastRank(world, 0)).toBe(rank - 1);
    const spinAfter = world.rows('RigSpinChanged').filter((row) => row.rigId === 0).at(-1)!.spin as number;
    expect(spinBefore - spinAfter).toBeLessThan(1); // only natural decay, no Break Out cost
  });

  it('at Wobble, Break Out still costs Spin', () => {
    const world = dummyWorld(() => {}, 0.25);
    rivalPress(world, 'whirl');
    hold(world, 'KeyD', 1);
    tap(world, 'KeyJ');
    stepUntilHit(world);
    hold(world, 'KeyD', 0);
    world.step(3);
    const spinBefore = world.rows('RigSpinChanged').filter((row) => row.rigId === 0).at(-1)!.spin as number;
    tap(world, 'KeyK');
    world.step();
    expect(world.rows('MoveStarted').some((row) => row.rigId === 0 && row.move === 'breakOut')).toBe(true);
    const spinAfter = world.rows('RigSpinChanged').filter((row) => row.rigId === 0).at(-1)!.spin as number;
    expect(spinBefore - spinAfter).toBeGreaterThan(5);
  });

  it('REDLINE: gains are boosted and a hit cannot drop the Rank below Steady', () => {
    const world = dummyWorld((data) => {
      data.style.revRules.redline.spinRatio = 1.01; // always in Redline, to test its rules
    });
    world.step(2);
    hold(world, 'KeyD', 1);
    tap(world, 'KeyI');
    stepUntilHit(world);
    world.step();
    const sling = world.rows('RevGained').find((row) => row.rigId === 0 && row.reason === 'sling')!;
    expect(sling.amount as number).toBeCloseTo(world.data.style.revGains.hits.sling * world.data.style.revRules.redline.gainMultiplier);
    // Idling drains Rev, but a Redline Rig never drops below Steady.
    hold(world, 'KeyD', 0);
    world.step(120 * 10);
    expect(lastRank(world, 0)).toBe(1);
  });
});

describe('the Shatter homes in', () => {
  const shatterWorld = (turnRate: number) =>
    dummyWorld((data) => {
      data.style.revRanks.shatterRank = 0;
      data.style.revRules.shatterRivalSpinRatio = 1.1;
      data.style.revRules.shatterChargeSeconds = 0;
      data.brawl.motion.homingTurnRate = turnRate;
      // Whatever Tactic the dummy is in, it keeps moving sideways.
      for (const command of Object.values(data.spinner.tacticCommands)) command.steer = 'orbitRival';
    }, 0.6);

  it('its heading bends toward a rival moving sideways; with no homing it flies straight', () => {
    const turned = (turnRate: number) => {
      const world = shatterWorld(turnRate);
      world.step(20);
      tap(world, 'KeyJ', 'KeyL');
      const heading = () => {
        const body = world.rows('RigBodiesMoved').filter((row) => row.rigId === 0).at(-1)!;
        return Math.atan2(body.vy as number, body.vx as number);
      };
      world.step(6);
      const early = heading();
      world.step(14);
      expect(world.rows('MoveStarted').some((row) => row.move === 'shatter')).toBe(true);
      return Math.abs(heading() - early);
    };
    expect(turned(0)).toBeLessThan(0.01);
    expect(turned(9)).toBeGreaterThan(0.05);
  });
});
