import { StepTicked } from '@engine/messaging/engineMessages';
import { on, onAny, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { feedFsm, tickFsm } from '@engine/state/fsm/fsmRuntime';
import type { FlowState } from '../state/flowState';

/** Every message routed to "flow.gameFlow" is an event (or start signal) for the gameFlow FSM. */
export function gameFlowHandlers(state: FlowState): HandlerDef[] {
  return [
    onAny('flow.gameFlow', (batch, typeName) => feedFsm(state.gameFlow, batch, typeName)),
    on(StepTicked, 'flow.tick', (batch) => {
      for (let i = 0; i < batch.count; i++) tickFsm(state.gameFlow, batch.cols.dt[i]);
    }),
  ];
}
