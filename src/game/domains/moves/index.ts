import type { DomainModule } from '../../shared/domainContext';
import { moveHandlers } from './handlers/moveHandlers';
import { createMovesState, type MovesState } from './state/movesState';

export { moveColumns, resolveMove } from './rules/resolveMove';

export const movesDomain: DomainModule<MovesState> = {
  name: 'moves',
  createState: createMovesState,
  createHandlers: moveHandlers,
};
