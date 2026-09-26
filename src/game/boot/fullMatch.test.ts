import { describe, expect, it } from 'vitest';
import { cloneGameData, loadGameData } from '../gameData/loadGameData';
import { RematchRequested } from '../messages/flowMessages';
import { createTestWorld } from './testing/createTestWorld';
import { playMatch } from './testing/playMatch';

/** Both Spinners on CPU, so the Match actually gets fought. */
function cpuVsCpu(seed: number) {
  const data = cloneGameData(loadGameData());
  const spinners = data.spinner.spinners as unknown as { controller: string; profileId: string }[];
  spinners[0].controller = 'cpu';
  spinners[0].profileId = spinners[1].profileId;
  return createTestWorld({ data, seed });
}

describe('a whole Match, headless', () => {
  it('goes title → drop-in → brawl → match result, and Rematch starts over', { timeout: 60_000 }, () => {
    const world = cpuVsCpu(7);
    const report = playMatch(world, 120 * 600);

    expect(report.winner).toBeDefined();
    const flow = world.rows('StateEntered').filter((row) => row.fsm === 'gameFlow').map((row) => row.state);
    expect(flow.slice(0, 3)).toEqual(['title', 'dropIn', 'brawl']);
    expect(flow.at(-1)).toBe('matchResult');
    expect(world.rows('CountdownBeat').map((row) => row.label).slice(0, 4)).toEqual(world.data.round.countdown.beats);
    expect(world.rows('HitLanded').length).toBeGreaterThan(0);

    const finishNames = world.data.round.finishConditions.map((row) => row.finish);
    for (const finish of report.finishes) expect(finishNames).toContain(finish.finish);
    const winnerPoints = world.rows('PointsAwarded').filter((row) => row.spinnerId === report.winner!.spinnerId).at(-1)!;
    expect(winnerPoints.total as number).toBeGreaterThanOrEqual(world.data.match.matchRules.pointsToWin);

    world.clearSent();
    world.publish(RematchRequested, {});
    world.step(2);
    expect(world.rows('PointsAwarded').every((row) => row.total === 0)).toBe(true);
    expect(world.rows('StateEntered').some((row) => row.fsm === 'gameFlow' && row.state === 'dropIn')).toBe(true);
    expect(world.rows('RoundStarted')[0].roundNo).toBe(1);
  });
});
