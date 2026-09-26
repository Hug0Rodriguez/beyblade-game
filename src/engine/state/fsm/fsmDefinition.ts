import type { Condition } from '../conditionTable/evaluateConditionTable';
import { findConditionErrors } from '../conditionTable/evaluateConditionTable';

export interface FsmTransition {
  readonly from: string; // a state or "*"
  readonly to: string;
  /** Fires when this message type is fed to the FSM. */
  readonly on?: string;
  /** Fires when these conditions pass during guard evaluation. */
  readonly when?: readonly Condition[];
}

export interface FsmDefinition {
  readonly initial: string;
  readonly states: readonly string[];
  readonly transitions: readonly FsmTransition[];
  /** Message type that (re)starts instance 0 at `initial`. */
  readonly startOn?: string;
  /** (Re)start instance 0 when another FSM enters this state. */
  readonly startWhen?: { readonly fsm: string; readonly state: string };
}

/** Structural checks: states exist, transitions have a trigger, every state is reachable. */
export function findFsmErrors(name: string, def: FsmDefinition, guardColumns: readonly string[]): string[] {
  const errors: string[] = [];
  const states = new Set(def.states);
  if (!states.has(def.initial)) errors.push(`${name}: initial state "${def.initial}" not in states`);
  def.transitions.forEach((t, i) => {
    if (t.from !== '*' && !states.has(t.from)) errors.push(`${name}.transitions[${i}]: unknown from "${t.from}"`);
    if (!states.has(t.to)) errors.push(`${name}.transitions[${i}]: unknown to "${t.to}"`);
    if (!t.on && !t.when) errors.push(`${name}.transitions[${i}]: needs "on" or "when"`);
    if (t.when) errors.push(...findConditionErrors(`${name}.transitions[${i}].when`, [{ when: t.when }], guardColumns));
  });
  const reached = new Set([def.initial]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of def.transitions) {
      if ((t.from === '*' || reached.has(t.from)) && !reached.has(t.to)) {
        reached.add(t.to);
        grew = true;
      }
    }
  }
  for (const state of def.states) if (!reached.has(state)) errors.push(`${name}: state "${state}" is unreachable`);
  return errors;
}
