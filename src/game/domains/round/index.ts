import type { DomainModule } from '../../shared/domainContext';
import { roundHandlers } from './handlers/roundHandlers';
import { createRoundState, type RoundState } from './state/roundState';
import { roundBannerHandlers } from './view/roundBanner';

export { finishColumns } from './state/roundState';

export const roundDomain: DomainModule<RoundState> = {
  name: 'round',
  createState: createRoundState,
  createHandlers: roundHandlers,
  createViewHandlers: roundBannerHandlers,
};
