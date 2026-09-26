import type { DomainModule } from '../../shared/domainContext';
import { rigHandlers } from './handlers/rigHandlers';
import { createRigState, type RigState } from './state/rigState';
import { rigHudHandlers } from './view/rigHud';
import { rigViewHandlers } from './view/rigViews';

export const rigDomain: DomainModule<RigState> = {
  name: 'rig',
  createState: createRigState,
  createHandlers: rigHandlers,
  createViewHandlers: (ctx) => [...rigViewHandlers(ctx), ...rigHudHandlers(ctx)],
};
