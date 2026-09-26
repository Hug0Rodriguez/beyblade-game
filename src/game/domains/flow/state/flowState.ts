import { createFsm, type FsmRuntime } from '@engine/state/fsm/fsmRuntime';
import type { DomainContext } from '../../../shared/domainContext';

export interface FlowState {
  readonly gameFlow: FsmRuntime;
}

export function createFlowState(ctx: DomainContext): FlowState {
  const gameFlow = createFsm(ctx.data.screens.screens.fsm, ctx.data.flow.gameFlow, 1, ctx.publish);
  ctx.inspect('flow', gameFlow.instances);
  return { gameFlow };
}
