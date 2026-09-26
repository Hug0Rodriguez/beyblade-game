import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../../gameData/loadGameData';
import { dropRanks, progressOf, rankOf, varietyFactor } from './revRank';

const { ranks, maxPoints } = loadGameData().style.revRanks;
const factors = loadGameData().style.revRules.varietyFactors;

describe('Rev Rank', () => {
  it('ranks climb by threshold, Wobble to ZENITH', () => {
    expect(ranks[rankOf(ranks, 0)].name).toBe('WOBBLE');
    expect(ranks[rankOf(ranks, ranks[4].threshold)].name).toBe('CYCLONE');
    expect(ranks[rankOf(ranks, maxPoints)].name).toBe('ZENITH');
  });

  it('progress runs 0..1 inside a Rank', () => {
    const start = ranks[1].threshold;
    const end = ranks[2].threshold;
    expect(progressOf(ranks, start, maxPoints)).toBe(0);
    expect(progressOf(ranks, (start + end) / 2, maxPoints)).toBeCloseTo(0.5);
  });

  it('variety: a fresh hit earns full value, repeats earn less', () => {
    expect(varietyFactor([], 'strike', factors)).toBe(1);
    expect(varietyFactor(['strike', 'launch'], 'strike', factors)).toBe(factors[1]);
    expect(varietyFactor(['strike', 'strike', 'strike'], 'strike', factors)).toBe(factors[3]);
    expect(varietyFactor(['strike', 'strike'], 'slam', factors)).toBe(1);
  });

  it('a whiffed Shatter drops two Ranks', () => {
    const vortex = ranks[5].threshold + 10;
    expect(ranks[rankOf(ranks, dropRanks(ranks, vortex, 2))].name).toBe('BLURRED');
    expect(dropRanks(ranks, 30, 2)).toBe(0);
  });
});
