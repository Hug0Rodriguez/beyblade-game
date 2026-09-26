import { defineTable, type Table } from '@engine/tables/defineTable';
import type { DomainContext } from '../../../shared/domainContext';
import { createFlowWatch, type FlowWatch } from '../../../shared/flowWatch';

const rigSchema = { spinnerId: 'u16', maxSpin: 'f64', spin: 'f64' } as const;

export interface RigState {
  readonly rigs: Table<typeof rigSchema>;
  /** Existence = this Rig's Spin does not decay (its Rev Rank sustains it). */
  readonly sustained: Table<Record<string, never>>;
  readonly flow: FlowWatch;
}

export function createRigState(ctx: DomainContext): RigState {
  const rigs = ctx.data.boot.capacities.rigs;
  const state: RigState = {
    rigs: defineTable('rigs', rigSchema, rigs),
    sustained: defineTable('spinSustained', {}, rigs),
    flow: createFlowWatch(ctx.data.screens.screens.fsm),
  };
  ctx.inspect('rig', state.rigs);
  return state;
}
