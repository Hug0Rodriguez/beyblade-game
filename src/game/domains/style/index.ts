import type { DomainModule } from '../../shared/domainContext';
import { revHandlers } from './handlers/revHandlers';
import { createStyleState, maxVarietyWindow, type StyleState } from './state/styleState';
import { calloutsViewHandlers } from './view/calloutsView';
import { revHudHandlers } from './view/revHud';

export { maxVarietyWindow };

export const styleDomain: DomainModule<StyleState> = {
  name: 'style',
  createState: createStyleState,
  createHandlers: revHandlers,
  createViewHandlers: (ctx) => [...revHudHandlers(ctx), ...calloutsViewHandlers(ctx)],
};
