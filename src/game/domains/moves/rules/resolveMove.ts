import { firstMatch } from '@engine/state/conditionTable/evaluateConditionTable';
import type { Scalar } from '@engine/state/conditionTable/operators';
import type { MoveRule } from '../../../gameData/schema/movesData';

/** Everything the move table can read about the Rig pressing a button. */
export interface MoveContext {
  /** The button being resolved ("dash", "pop", "whirl", "combo"). */
  button: string;
  /** Current moveFlow state. */
  state: string;
  /** 1 while the current state is in moveTuning.lockedStates. */
  locked: number;
  airborne: number;
  spinRatio: number;
  shatterReady: number;
  /** Rev Rank (index into revRanks): what the Rig can spend. */
  rank: number;
  /** "<move>Ready" = 1 when that move is not cooling down. */
  ready: Readonly<Record<string, number>>;
}

export const baseMoveColumns = ['button', 'state', 'locked', 'airborne', 'spinRatio', 'shatterReady', 'rank'] as const;

/** Every column the move table may use, given the move names (for validation). */
export function moveColumns(moveNames: readonly string[]): string[] {
  return [...baseMoveColumns, ...moveNames.map((name) => `${name}Ready`)];
}

export function readMoveContext(context: MoveContext, column: string): Scalar {
  if (column.endsWith('Ready') && column !== 'shatterReady') return context.ready[column.slice(0, -'Ready'.length)] ?? 0;
  return context[column as Exclude<keyof MoveContext, 'ready'>];
}

/** The move a button press starts, or undefined when the table allows none. */
export function resolveMove(rows: readonly MoveRule[], context: MoveContext, refs: Readonly<Record<string, unknown>>): string | undefined {
  return firstMatch(rows, (column) => readMoveContext(context, column), refs)?.move;
}
