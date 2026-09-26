import { passes } from '@engine/state/conditionTable/evaluateConditionTable';
import type { GameData } from '../../../gameData/gameData';
import type { MatchState } from '../state/matchState';

/** Row of the first Spinner whose points pass matchRules.winWhen, or -1. */
export function matchWinner(state: MatchState, data: GameData): number {
  const rules = data.match.matchRules;
  const { points } = state;
  for (let row = 0; row < points.count; row++) {
    if (passes(rules.winWhen, () => points.cols.points[row], rules)) return row;
  }
  return -1;
}
