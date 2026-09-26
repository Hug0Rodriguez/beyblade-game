import type { DomainModule } from '../../shared/domainContext';
import { rigHandlers } from './handlers/rigHandlers';
import { createRigState, type RigState } from './state/rigState';
import { rigHudHandlers } from './view/rigHud';

export { outcomeEffectNames } from './view/outcomeEffects';
import { rigViewHandlers } from './view/rigViews';

export const rigDomain: DomainModule<RigState> = {
  name: 'rig',
  createState: createRigState,
  createHandlers: rigHandlers,
  createViewHandlers: (ctx) => [...rigViewHandlers(ctx), ...rigHudHandlers(ctx)],
};
