import { Container, Graphics } from 'pixi.js';
import { ViewportResized } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { PointsAwarded } from '../../../messages/matchMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { panelRect, underPanelY } from '../../../shared/hudLayout';

interface PointsView {
  readonly slot: number;
  readonly pips: Graphics;
  total: number;
}

/** One pip per point toward the target, under each Spinner's HUD panel. */
export function pointsDisplayHandlers(ctx: ViewContext): HandlerDef[] {
  const hud = ctx.data.hud.hud;
  const root = new Container();
  ctx.screens.layer('hud').addChild(root);
  const views = new Map<number, PointsView>();
  let screenWidth = 0;

  const draw = (view: PointsView) => {
    const { pipRadius, pipGap, filledColor, emptyColor } = hud.points;
    const target = ctx.data.match.matchRules.pointsToWin;
    const rect = panelRect(view.slot, screenWidth, hud);
    const step = pipRadius * 2 + pipGap;
    const startX = rect.side === 1 ? rect.x + pipRadius : rect.x + rect.width - pipRadius;
    const y = underPanelY(hud) + pipRadius;
    view.pips.clear();
    for (let pip = 0; pip < target; pip++) {
      view.pips.circle(startX + rect.side * pip * step, y, pipRadius).fill({ color: pip < view.total ? filledColor : emptyColor });
    }
  };

  return [
    on(SpinnerAssigned, 'match.view.onSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = { slot: batch.cols.slot[i], pips: new Graphics(), total: 0 };
        root.addChild(view.pips);
        views.set(batch.cols.spinnerId[i], view);
        draw(view);
      }
    }),
    on(PointsAwarded, 'match.view.onPointsAwarded', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const view = views.get(batch.cols.spinnerId[i]);
        if (!view) continue;
        view.total = batch.cols.total[i];
        draw(view);
      }
    }),
    on(ViewportResized, 'match.view.layout', (batch) => {
      screenWidth = batch.cols.width[batch.count - 1];
      for (const view of views.values()) draw(view);
    }),
  ];
}
