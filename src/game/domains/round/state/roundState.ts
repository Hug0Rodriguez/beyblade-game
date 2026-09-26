import { defineTable, type Table } from '@engine/tables/defineTable';
import { createFsm, type FsmRuntime } from '@engine/state/fsm/fsmRuntime';
import type { DomainContext } from '../../../shared/domainContext';
import { createFlowWatch, type FlowWatch } from '../../../shared/flowWatch';

/** The Round's own copy of what decides a Finish, per Rig. Columns = finishConditions columns. */
const finishTrackingSchema = { spin: 'f64', spinRatio: 'f64', spilled: 'u8', shattered: 'u8' } as const;

export const finishColumns = Object.keys(finishTrackingSchema);

export interface RoundState {
  readonly roundFlow: FsmRuntime;
  readonly tracking: Table<typeof finishTrackingSchema>;
  readonly flow: FlowWatch;
  roundNo: number;
  /** Drop-in countdown: seconds since the Round started, and the last beat published (-1 = none). */
  countdownTime: number;
  countdownBeat: number;
}

export function createRoundState(ctx: DomainContext): RoundState {
  const state: RoundState = {
    roundFlow: createFsm('roundFlow', ctx.data.round.roundFlow, 1, ctx.publish),
    tracking: defineTable('finishTracking', finishTrackingSchema, ctx.data.boot.capacities.rigs),
    flow: createFlowWatch(ctx.data.screens.screens.fsm),
    roundNo: 0,
    countdownTime: 0,
    countdownBeat: -1,
  };
  ctx.inspect('round', state.tracking);
  ctx.inspect('round', state.roundFlow.instances);
  return state;
}
