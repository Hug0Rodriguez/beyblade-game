import { defineTable, type Table } from '@engine/tables/defineTable';
import type { DomainContext } from '../../../shared/domainContext';
import { createFlowWatch, type FlowWatch } from '../../../shared/flowWatch';

const bodySchema = {
  slot: 'u16',
  x: 'f64',
  y: 'f64',
  z: 'f64',
  vx: 'f64',
  vy: 'f64',
  vz: 'f64',
  radius: 'f64',
  weight: 'f64',
  baseSpeed: 'f64',
  facingX: 'f64',
  facingY: 'f64',
  /** Current Gear (gears.json row), published as GearChanged when it changes. */
  gear: 'u8',
} as const;

/** This domain's copy of each Rig's moveFlow state (from StateEntered) and how long it has been in it. */
const moveStateSchema = { state: 'str', age: 'f64' } as const;

/**
 * Existence = the Rig's move can still land a hit. `reach` scales its radius, but only toward
 * rivals within the arc around (dirX, dirY) whose cosine is `arcCos` (-1 = all around).
 */
const attackSchema = { move: 'str', kind: 'str', timeLeft: 'f64', reach: 'f64', dirX: 'f64', dirY: 'f64', arcCos: 'f64' } as const;

/** Existence = the Rig can't be hit (timer). Also used for "recently bounced off the Rim". */
const timerSchema = { timeLeft: 'f64' } as const;

/** Existence = these two Rigs were touching last check. Key = a * rigCapacity + b (a < b). */
const touchingSchema = {} as const;

export interface BrawlState {
  readonly bodies: Table<typeof bodySchema>;
  readonly steer: Table<{ x: 'f64'; y: 'f64' }>;
  readonly forces: Table<{ ax: 'f64'; ay: 'f64' }>;
  readonly moveStates: Table<typeof moveStateSchema>;
  readonly attacks: Table<typeof attackSchema>;
  readonly iFrames: Table<typeof timerSchema>;
  readonly rimRecent: Table<typeof timerSchema>;
  readonly touching: Table<typeof touchingSchema>;
  /** Juggle hits taken since the Rig last touched down. */
  readonly juggles: Table<{ count: 'u16' }>;
  /** Existence = the Rig was just slung; hitting the Rim before timeLeft runs out is a Wall Splat for `by`. */
  readonly slung: Table<{ by: 'u16'; hit: 'str'; timeLeft: 'f64' }>;
  /** Damage multiplier per Rig (Rev Rank); missing = 1. */
  readonly multipliers: Table<{ multiplier: 'f64' }>;
  readonly flow: FlowWatch;
  readonly rigCapacity: number;
}

export type BodyTable = BrawlState['bodies'];

export function createBrawlState(ctx: DomainContext): BrawlState {
  const rigs = ctx.data.boot.capacities.rigs;
  const state: BrawlState = {
    bodies: defineTable('rigBodies', bodySchema, rigs),
    steer: defineTable('steer', { x: 'f64', y: 'f64' }, rigs),
    forces: defineTable('dishForces', { ax: 'f64', ay: 'f64' }, rigs),
    moveStates: defineTable('brawlMoveStates', moveStateSchema, rigs),
    attacks: defineTable('attacks', attackSchema, rigs),
    iFrames: defineTable('iFrames', timerSchema, rigs),
    rimRecent: defineTable('rimRecent', timerSchema, rigs),
    touching: defineTable('touching', touchingSchema, rigs * rigs, rigs * rigs),
    juggles: defineTable('juggles', { count: 'u16' }, rigs),
    slung: defineTable('slung', { by: 'u16', hit: 'str', timeLeft: 'f64' }, rigs),
    multipliers: defineTable('damageMultipliers', { multiplier: 'f64' }, rigs),
    flow: createFlowWatch(ctx.data.screens.screens.fsm),
    rigCapacity: rigs,
  };
  ctx.inspect('brawl', state.bodies);
  ctx.inspect('brawl', state.attacks);
  ctx.inspect('brawl', state.iFrames);
  return state;
}
