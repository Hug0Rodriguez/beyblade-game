import { defineTable, type Table } from '@engine/tables/defineTable';
import type { DomainContext } from '../../../shared/domainContext';

/** Points per Spinner (keyed by Spinner id). */
const pointsSchema = { points: 'f64', name: 'str' } as const;

export interface MatchState {
  readonly points: Table<typeof pointsSchema>;
}

export function createMatchState(ctx: DomainContext): MatchState {
  const state: MatchState = { points: defineTable('points', pointsSchema, ctx.data.boot.capacities.spinners) };
  ctx.inspect('match', state.points);
  return state;
}
