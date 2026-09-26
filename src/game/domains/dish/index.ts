import type { DomainModule } from '../../shared/domainContext';
import { dishHandlers } from './handlers/dishHandlers';
import { createDishState, type DishState } from './state/dishState';
import { dishViewHandlers } from './view/dishView';

export const dishDomain: DomainModule<DishState> = {
  name: 'dish',
  createState: createDishState,
  createHandlers: dishHandlers,
  createViewHandlers: dishViewHandlers,
};
export { ridesRimLine } from './rules/dishGeometry';
