import type { DomainModule } from '../../shared/domainContext';
import { gameFlowHandlers } from './handlers/gameFlow';
import { createFlowState, type FlowState } from './state/flowState';

export const flowDomain: DomainModule<FlowState> = {
  name: 'flow',
  createState: createFlowState,
  createHandlers: (state) => gameFlowHandlers(state),
};
