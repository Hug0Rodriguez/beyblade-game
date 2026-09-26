import type { MessageBatch } from '@engine/messaging/defineMessage';
import type { StateEntered } from '@engine/messaging/engineMessages';

/** A domain's own copy of which state an FSM is in, kept current from StateEntered messages. */
export interface FlowWatch {
  readonly fsm: string;
  state: string;
}

export function createFlowWatch(fsm: string): FlowWatch {
  return { fsm, state: '' };
}

/** Applies a StateEntered batch; returns the newly entered state (or undefined when unrelated). */
export function watchFlow(watch: FlowWatch, batch: MessageBatch<typeof StateEntered.schema>): string | undefined {
  let entered: string | undefined;
  for (let i = 0; i < batch.count; i++) {
    if (batch.cols.fsm[i] !== watch.fsm) continue;
    watch.state = batch.cols.state[i];
    entered = watch.state;
  }
  return entered;
}

export function isActive(watch: FlowWatch, activeStates: readonly string[]): boolean {
  return activeStates.includes(watch.state);
}
