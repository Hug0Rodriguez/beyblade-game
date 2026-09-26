import type { DomainModule } from '../../shared/domainContext';
import { matchHandlers } from './handlers/matchHandlers';
import { createMatchState, type MatchState } from './state/matchState';
import { pointsDisplayHandlers } from './view/pointsDisplay';

export const matchDomain: DomainModule<MatchState> = {
  name: 'match',
  createState: createMatchState,
  createHandlers: matchHandlers,
  createViewHandlers: pointsDisplayHandlers,
};
