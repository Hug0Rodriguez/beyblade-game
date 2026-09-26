import { defineTable, type Table } from '@engine/tables/defineTable';
import type { DomainContext } from '../../../shared/domainContext';
import { createFlowWatch, type FlowWatch } from '../../../shared/flowWatch';

/** Longest recent-hit window the table can hold (revRules.varietyWindow must fit). */
export const maxVarietyWindow = 8;

const revSchema = {
  points: 'f64',
  publishedPoints: 'f64',
  idle: 'f64',
  baseSpeed: 'f64',
  speed: 'f64',
  airborne: 'u8',
  spinRatio: 'f64',
  shatterReady: 'u8',
  /** 1 while in Redline (low Spin): gains boosted, passive losses floored. */
  redline: 'u8',
  /** Seconds held at the Shatter Rank (the Shatter charges before it's ready) and the last published progress. */
  zenithTime: 'f64',
  chargeShown: 'f64',
  /** Ring buffer of the last landed hit names. */
  h0: 'str',
  h1: 'str',
  h2: 'str',
  h3: 'str',
  h4: 'str',
  h5: 'str',
  h6: 'str',
  h7: 'str',
  cursor: 'u8',
} as const;

export interface StyleState {
  readonly rev: Table<typeof revSchema>;
  readonly flow: FlowWatch;
  /** The Round has been decided (no Shatter until the next one). */
  roundOver: boolean;
}

export function createStyleState(ctx: DomainContext): StyleState {
  const state: StyleState = {
    rev: defineTable('rev', revSchema, ctx.data.boot.capacities.rigs),
    flow: createFlowWatch(ctx.data.screens.screens.fsm),
    roundOver: false,
  };
  ctx.inspect('style', state.rev);
  return state;
}
