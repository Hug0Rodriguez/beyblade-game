import type { DomainModule } from '../../shared/domainContext';
import { moveHandlers } from './handlers/moveHandlers';
import { createMovesState, type MovesState } from './state/movesState';
import { triangleHudHandlers } from './view/triangleHud';

export { moveColumns, resolveMove } from './rules/resolveMove';

export const movesDomain: DomainModule<MovesState> = {
  name: 'moves',
  createState: createMovesState,
  createHandlers: moveHandlers,
  createViewHandlers: triangleHudHandlers,
};
