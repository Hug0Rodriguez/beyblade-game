import type { ConditionRow } from '@engine/state/conditionTable/evaluateConditionTable';

export type { ConditionRow };
export type { FsmDefinition } from '@engine/state/fsm/fsmDefinition';
export type Condition = ConditionRow['when'][number];

/** A particle burst preset authored in data (color supplied by the caller unless present). */
export interface BurstData {
  readonly count: number;
  readonly speedMin: number;
  readonly speedMax: number;
  readonly life: number;
  readonly size: number;
  readonly spread?: number;
  readonly drag: number;
  readonly color?: string;
}
