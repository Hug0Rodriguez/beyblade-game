import { defineTable, type Table } from '@engine/tables/defineTable';
import { createFsm, type FsmRuntime } from '@engine/state/fsm/fsmRuntime';
import type { DomainContext } from '../../../shared/domainContext';
import { createFlowWatch, type FlowWatch } from '../../../shared/flowWatch';

/** Existence = this Rig is in the fight. Columns = what the move table reads besides the FSM state. */
const rigSchema = { airborne: 'u8', spinRatio: 'f64', shatterReady: 'u8', dashPressedAt: 'f64', whirlPressedAt: 'f64', aimX: 'f64', aimY: 'f64', pressAimX: 'f64', pressAimY: 'f64', rank: 'u16', pressedMove: 'str' } as const;

/** Existence = that move is cooling down for that Rig. Key = rigId * moveCount + moveIndex. */
const cooldownSchema = { timeLeft: 'f64' } as const;

export interface MovesState {
  readonly rigs: Table<typeof rigSchema>;
  readonly cooldowns: Table<typeof cooldownSchema>;
  readonly moveFlow: FsmRuntime;
  /** moveTuning.moves keys, in order (a move's index in the cooldown key). */
  readonly moveNames: readonly string[];
  readonly flow: FlowWatch;
  /** Simulation clock, for press timing. */
  clock: number;
}

export type MovesRigTable = MovesState['rigs'];

export function createMovesState(ctx: DomainContext): MovesState {
  const rigCount = ctx.data.boot.capacities.rigs;
  const moveNames = Object.keys(ctx.data.moves.moveTuning.moves);
  const state: MovesState = {
    rigs: defineTable('moveRigs', rigSchema, rigCount),
    cooldowns: defineTable('moveCooldowns', cooldownSchema, rigCount * Math.max(1, moveNames.length)),
    moveFlow: createFsm(ctx.data.moves.moveTuning.fsm, ctx.data.moves.moveFlow, rigCount, ctx.publish),
    moveNames,
    flow: createFlowWatch(ctx.data.screens.screens.fsm),
    clock: 1,
  };
  ctx.inspect('moves', state.moveFlow.instances);
  ctx.inspect('moves', state.cooldowns);
  return state;
}
