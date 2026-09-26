import { defineTable, type Table } from '@engine/tables/defineTable';
import type { DomainContext } from '../../../shared/domainContext';
import { createFlowWatch, type FlowWatch } from '../../../shared/flowWatch';

/** The Dish's own copy of every Rig body it needs. */
const trackedSchema = { x: 'f64', y: 'f64', z: 'f64', vx: 'f64', vy: 'f64', radius: 'f64', airborne: 'u8' } as const;

export interface DishState {
  readonly tracked: Table<typeof trackedSchema>;
  /** Existence = the Rig has left the Dish this Round. */
  readonly spilled: Table<Record<string, never>>;
  readonly flow: FlowWatch;
}

export function createDishState(ctx: DomainContext): DishState {
  const rigs = ctx.data.boot.capacities.rigs;
  const state: DishState = {
    tracked: defineTable('dishTracked', trackedSchema, rigs),
    spilled: defineTable('spilled', {}, rigs),
    flow: createFlowWatch(ctx.data.screens.screens.fsm),
  };
  ctx.inspect('dish', state.tracked);
  return state;
}
