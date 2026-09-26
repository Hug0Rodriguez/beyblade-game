import type { RevRank } from '../../../gameData/schema/styleData';

/** Index of the highest Rank whose threshold `points` has reached. */
export function rankOf(ranks: readonly RevRank[], points: number): number {
  let rank = 0;
  for (let i = 0; i < ranks.length; i++) if (points >= ranks[i].threshold) rank = i;
  return rank;
}

/** 0..1 progress from the current Rank's threshold to the next (1 at the top Rank). */
export function progressOf(ranks: readonly RevRank[], points: number, maxPoints: number): number {
  const rank = rankOf(ranks, points);
  const from = ranks[rank].threshold;
  const to = rank + 1 < ranks.length ? ranks[rank + 1].threshold : maxPoints;
  return to > from ? Math.min(1, (points - from) / (to - from)) : 1;
}

/** Gain multiplier for a hit, by how often it already appears in the recent-hit window. */
export function varietyFactor(window: readonly string[], hit: string, factors: readonly number[]): number {
  let repeats = 0;
  for (const entry of window) if (entry === hit) repeats++;
  return factors[Math.min(repeats, factors.length - 1)] ?? 1;
}

/** Points after dropping `ranks` Ranks (lands exactly on the lower Rank's threshold). */
export function dropRanks(ranks: readonly RevRank[], points: number, drop: number): number {
  if (drop <= 0) return points;
  const rank = Math.max(0, rankOf(ranks, points) - drop);
  return Math.min(points, ranks[rank].threshold);
}
