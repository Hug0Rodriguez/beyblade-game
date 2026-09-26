import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { el } from '@engine/ui/dom/el';
import { PointsAwarded } from '../../../messages/matchMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { hudColumn } from '../../../gui/hudColumns';

/** One pip per point toward the target, under each Spinner's HUD panel (HTML). */
export function pointsDisplayHandlers(ctx: ViewContext): HandlerDef[] {
  const layer = ctx.gui.layer('hud');
  const views = new Map<number, HTMLElement[]>();

  return [
    on(SpinnerAssigned, 'match.view.onSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const root = el('div', 'pips points');
        const pips: HTMLElement[] = [];
        for (let pip = 0; pip < ctx.data.match.matchRules.pointsToWin; pip++) {
          const dot = el('i');
          root.appendChild(dot);
          pips.push(dot);
        }
        hudColumn(layer, batch.cols.slot[i]).appendChild(root);
        views.set(batch.cols.spinnerId[i], pips);
      }
    }),
    on(PointsAwarded, 'match.view.onPointsAwarded', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const pips = views.get(batch.cols.spinnerId[i]);
        if (!pips) continue;
        pips.forEach((pip, index) => pip.classList.toggle('filled', index < batch.cols.total[i]));
      }
    }),
  ];
}
