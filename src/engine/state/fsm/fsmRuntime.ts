import type { RowValues, Schema } from '../../tables/columns';
import { defineTable, type Table } from '../../tables/defineTable';
import { has, insert, remove, rowOf } from '../../tables/tableOps';
import type { MessageBatch, MessageType } from '../../messaging/defineMessage';
import { StateEntered, StateExited } from '../../messaging/engineMessages';
import { passes, type ReadColumn } from '../conditionTable/evaluateConditionTable';
import type { Scalar } from '../conditionTable/operators';
import type { ConditionRefs } from '../conditionTable/resolveRefs';
import type { FsmDefinition } from './fsmDefinition';

type Publish = <S extends Schema>(type: MessageType<S>, values: RowValues<S>) => void;

const fsmInstanceSchema = { state: 'str', timeInState: 'f64', transitioned: 'u8' } as const;

/** Instances of one FSM definition, one row per instance id. */
export interface FsmRuntime {
  readonly name: string;
  readonly def: FsmDefinition;
  readonly instances: Table<typeof fsmInstanceSchema>;
  readonly publish: Publish;
}

export function createFsm(name: string, def: FsmDefinition, capacity: number, publish: Publish): FsmRuntime {
  return { name, def, instances: defineTable(`fsm:${name}`, fsmInstanceSchema, capacity), publish };
}

export function stateOf(fsm: FsmRuntime, instance: number): string | undefined {
  const row = rowOf(fsm.instances, instance);
  return row === -1 ? undefined : fsm.instances.cols.state[row];
}

export function timeInState(fsm: FsmRuntime, instance: number): number {
  const row = rowOf(fsm.instances, instance);
  return row === -1 ? 0 : fsm.instances.cols.timeInState[row];
}

function enter(fsm: FsmRuntime, instance: number, state: string): void {
  const previous = stateOf(fsm, instance);
  if (previous !== undefined) fsm.publish(StateExited, { fsm: fsm.name, instance, state: previous });
  insert(fsm.instances, instance, { state, timeInState: 0, transitioned: 1 });
  fsm.publish(StateEntered, { fsm: fsm.name, instance, state });
}

/**
 * Enters `state` directly (re-entering restarts its timer). For commanded changes that must not
 * wait for the one-transition-per-step rule, e.g. a player's move.
 */
export function enterState(fsm: FsmRuntime, instance: number, state: string): void {
  if (!fsm.def.states.includes(state)) throw new Error(`FSM "${fsm.name}" has no state "${state}"`);
  enter(fsm, instance, state);
}

/** The state `event` leads to from the instance's current state, ignoring the per-step rule. */
export function targetOf(fsm: FsmRuntime, instance: number, event: string): string | undefined {
  const current = stateOf(fsm, instance);
  if (current === undefined) return undefined;
  for (const t of fsm.def.transitions) {
    if (t.on === event && (t.from === current || t.from === '*') && t.to !== current) return t.to;
  }
  return undefined;
}

/** Puts an instance in the initial state (restarting it if it was running). */
export function startInstance(fsm: FsmRuntime, instance: number): void {
  enter(fsm, instance, fsm.def.initial);
}

export function stopInstance(fsm: FsmRuntime, instance: number): void {
  const previous = stateOf(fsm, instance);
  if (previous === undefined) return;
  fsm.publish(StateExited, { fsm: fsm.name, instance, state: previous });
  remove(fsm.instances, instance);
}

export function isRunning(fsm: FsmRuntime, instance: number): boolean {
  return has(fsm.instances, instance);
}

/** Advances time and re-arms transitions. Call once per step, before feeding events or guards. */
export function tickFsm(fsm: FsmRuntime, dt: number): void {
  const { timeInState: time, transitioned } = fsm.instances.cols;
  for (let row = 0; row < fsm.instances.count; row++) {
    time[row] += dt;
    transitioned[row] = 0;
  }
}

function canTransition(fsm: FsmRuntime, instance: number): string | undefined {
  const row = rowOf(fsm.instances, instance);
  if (row === -1 || fsm.instances.cols.transitioned[row] === 1) return undefined;
  return fsm.instances.cols.state[row];
}

/** Feeds a message type as an event. At most one transition per instance per step. Returns the new state. */
export function sendEvent(fsm: FsmRuntime, instance: number, event: string): string | undefined {
  const current = canTransition(fsm, instance);
  if (current === undefined) return undefined;
  for (const t of fsm.def.transitions) {
    if (t.on !== event || (t.from !== current && t.from !== '*') || t.to === current) continue;
    enter(fsm, instance, t.to);
    return t.to;
  }
  return undefined;
}

/**
 * Evaluates condition-guarded transitions for one instance. `read` supplies the owner's columns;
 * "timeInState" is always available. Returns the new state when one fired.
 */
export function evaluateGuards(
  fsm: FsmRuntime,
  instance: number,
  read: ReadColumn,
  refs: ConditionRefs,
): string | undefined {
  const current = canTransition(fsm, instance);
  if (current === undefined) return undefined;
  const elapsed = timeInState(fsm, instance);
  const readWithTime: ReadColumn = (column): Scalar => (column === 'timeInState' ? elapsed : read(column));
  for (const t of fsm.def.transitions) {
    if (!t.when || t.on || (t.from !== current && t.from !== '*') || t.to === current) continue;
    if (!passes(t.when, readWithTime, refs)) continue;
    enter(fsm, instance, t.to);
    return t.to;
  }
  return undefined;
}

/**
 * Generic message → FSM adapter for single-instance FSMs: honours `startOn`, `startWhen`
 * and otherwise treats the message type as an event.
 */
export function feedFsm(fsm: FsmRuntime, batch: MessageBatch<Schema>, typeName: string): void {
  if (typeName === fsm.def.startOn) {
    startInstance(fsm, 0);
    return;
  }
  if (typeName === StateEntered.name && fsm.def.startWhen) {
    const entered = batch as unknown as MessageBatch<typeof StateEntered.schema>;
    for (let i = 0; i < entered.count; i++) {
      if (entered.cols.fsm[i] === fsm.def.startWhen.fsm && entered.cols.state[i] === fsm.def.startWhen.state) {
        startInstance(fsm, 0);
      }
    }
    return;
  }
  sendEvent(fsm, 0, typeName);
}
