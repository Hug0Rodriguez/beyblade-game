import type { SeededRandom } from '@shared/random/seededRandom';
import { defineTable, type Table } from '@engine/tables/defineTable';
import { createFsm, type FsmRuntime } from '@engine/state/fsm/fsmRuntime';
import type { HumanCommandName } from '../../../gameData/schema/spinnerData';
import type { DomainContext } from '../../../shared/domainContext';
import { createFlowWatch, type FlowWatch } from '../../../shared/flowWatch';
import { keyBindingTable } from '../rules/keyBindings';

const spinnerSchema = { slot: 'u16', name: 'str', controller: 'str', rigId: 'str' } as const;

/** Existence = this Spinner is a person. Columns are that person's raw input. */
const humanSchema = {
  steerUp: 'u8',
  steerDown: 'u8',
  steerLeft: 'u8',
  steerRight: 'u8',
  joyX: 'f64',
  joyY: 'f64',
  /** A held attack button dragged past its threshold: where the move should go (zero = use the steer). */
  aimX: 'f64',
  aimY: 'f64',
  dashQueued: 'u8',
  popQueued: 'u8',
  whirlQueued: 'u8',
  hookQueued: 'u8',
  confirmQueued: 'u8',
} as const;

/** Existence = this Spinner is a CPU. Columns are its decision state. */
const cpuSchema = {
  profileIndex: 'u16',
  decisionTimer: 'f64',
  steerX: 'f64',
  steerY: 'f64',
  dashQueued: 'u8',
  popQueued: 'u8',
  whirlQueued: 'u8',
  hookQueued: 'u8',
  timeSinceStrike: 'f64',
  /** Running combo script (index into cpuCombos, -1 = none), its clock and next step. */
  comboIndex: 'i32',
  comboTime: 'f64',
  comboStep: 'u16',
} as const;

/** What this domain has seen of every Rig, via messages (keyed by Rig id). */
const observedRigSchema = {
  x: 'f64',
  y: 'f64',
  z: 'f64',
  vx: 'f64',
  vy: 'f64',
  airborne: 'u8',
  spinRatio: 'f64',
  move: 'str',
  shatterReady: 'u8',
  gear: 'u8',
  rank: 'u16',
} as const;

export interface SpinnerState {
  readonly spinners: Table<typeof spinnerSchema>;
  readonly humans: Table<typeof humanSchema>;
  readonly cpus: Table<typeof cpuSchema>;
  readonly observedRigs: Table<typeof observedRigSchema>;
  readonly tactics: FsmRuntime;
  readonly flow: FlowWatch;
  /** Index = key index in KeyChanged; value = the command that key drives. */
  readonly keyCommands: readonly HumanCommandName[];
  readonly random: SeededRandom;
}

export type HumanTable = SpinnerState['humans'];
export type CpuTable = SpinnerState['cpus'];
export type ObservedRigTable = SpinnerState['observedRigs'];

export function createSpinnerState(ctx: DomainContext): SpinnerState {
  const { spinners: spinnerCount, rigs: rigCount } = ctx.data.boot.capacities;
  const state: SpinnerState = {
    spinners: defineTable('spinners', spinnerSchema, spinnerCount),
    humans: defineTable('humanSpinners', humanSchema, spinnerCount),
    cpus: defineTable('cpuSpinners', cpuSchema, spinnerCount),
    observedRigs: defineTable('observedRigs', observedRigSchema, rigCount),
    tactics: createFsm('cpuTactics', ctx.data.spinner.cpuTactics, spinnerCount, ctx.publish),
    flow: createFlowWatch(ctx.data.screens.screens.fsm),
    keyCommands: keyBindingTable(ctx.data).commands,
    random: ctx.random('spinner'),
  };
  ctx.inspect('spinner', state.spinners);
  ctx.inspect('spinner', state.humans);
  ctx.inspect('spinner', state.cpus);
  ctx.inspect('spinner', state.tactics.instances);
  return state;
}
