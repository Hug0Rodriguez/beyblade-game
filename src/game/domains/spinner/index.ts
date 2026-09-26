import type { DomainModule } from '../../shared/domainContext';
import { cpuHandlers } from './handlers/decideCpuCommands';
import { humanInputHandlers } from './handlers/humanInput';
import { observeHandlers } from './handlers/observe';
import { readHumanCommandsHandler } from './handlers/readHumanCommands';
import { rosterHandlers } from './handlers/roster';
import { createSpinnerState, type SpinnerState } from './state/spinnerState';
import { touchControlsViewHandlers } from './view/touchControlsView';

export { watchedKeyCodes } from './rules/keyBindings';
export { cpuSenseColumns } from './rules/cpu/senseRival';
export { steerModes } from './rules/cpu/steerModes';

export const spinnerDomain: DomainModule<SpinnerState> = {
  name: 'spinner',
  createState: createSpinnerState,
  createHandlers: (state, ctx) => [
    ...rosterHandlers(state, ctx),
    ...humanInputHandlers(state, ctx),
    readHumanCommandsHandler(state, ctx),
    ...cpuHandlers(state, ctx),
    ...observeHandlers(state, ctx),
  ],
  createViewHandlers: touchControlsViewHandlers,
};
