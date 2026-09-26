import { firstMatch } from '@engine/state/conditionTable/evaluateConditionTable';
import type { ConditionRefs } from '@engine/state/conditionTable/resolveRefs';
import type { Table } from '@engine/tables/defineTable';
import type { Schema } from '@engine/tables/columns';
import type { FinishCondition } from '../../../gameData/schema/roundData';

export interface FinishResult {
  rigId: number;
  condition: FinishCondition;
}

/**
 * Evaluates finishConditions for every tracked Rig. The loser is the Rig whose matching
 * Finish has the best (lowest) priority; ties go to the Rig with less Spin.
 */
export function findFinish(
  tracking: Table<Schema & { spin: 'f64' }>,
  conditions: readonly FinishCondition[],
  refs: ConditionRefs,
): FinishResult | undefined {
  let result: FinishResult | undefined;
  let resultSpin = 0;
  for (let row = 0; row < tracking.count; row++) {
    const read = (column: string) => (tracking.cols[column] as { [i: number]: number | string })[row];
    const condition = firstMatch(conditions, read, refs);
    if (!condition) continue;
    const spin = tracking.cols.spin[row];
    const better =
      !result ||
      (condition.priority ?? 0) < (result.condition.priority ?? 0) ||
      ((condition.priority ?? 0) === (result.condition.priority ?? 0) && spin < resultSpin);
    if (better) {
      result = { rigId: tracking.ids[row], condition };
      resultSpin = spin;
    }
  }
  return result;
}
