import type { DomainModule } from '../../shared/domainContext';
import { bodyLifecycleHandlers } from './handlers/bodyLifecycle';
import { contactHandlers } from './handlers/contacts';
import { motionHandlers } from './handlers/motion';
import { createBrawlState, type BrawlState } from './state/brawlState';
import { brawlFxHandlers } from './view/brawlFx';

export { hitColumns } from './rules/resolveHit';

export const brawlDomain: DomainModule<BrawlState> = {
  name: 'brawl',
  createState: createBrawlState,
  createHandlers: (state, ctx) => [
    ...bodyLifecycleHandlers(state, ctx),
    ...motionHandlers(state, ctx),
    ...contactHandlers(state, ctx),
  ],
  createViewHandlers: brawlFxHandlers,
};
