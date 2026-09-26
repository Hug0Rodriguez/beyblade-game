import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { createDomBanner } from '@engine/ui/dom/banner';
import { CountdownBeat, RoundFinished, RoundStarted } from '../../../messages/roundMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { fillTemplate } from '../../../shared/units';

/** The drop-in countdown ("3 · 2 · 1 · RIOT!"), the Round label and the Finish callout (HTML). */
export function roundBannerHandlers(ctx: ViewContext): HandlerDef[] {
  const hud = ctx.data.hud.hud;
  const banner = createDomBanner('banner-big');
  const label = createDomBanner('banner-small');
  ctx.gui.layer('banner').append(banner.element, label.element);

  return [
    on(RoundStarted, 'round.view.onRoundStarted', (batch) => {
      const roundNo = batch.cols.roundNo[batch.count - 1];
      label.show(fillTemplate(ctx.data.screens.copy.roundLabel, { round: roundNo }), hud.panel.detailColor, ctx.data.round.roundRules.roundLabelSeconds);
    }),
    on(CountdownBeat, 'round.view.onCountdownBeat', (batch) => {
      const i = batch.count - 1;
      const countdown = ctx.data.round.countdown;
      banner.show(batch.cols.label[i], batch.cols.go[i] === 1 ? countdown.goColor : countdown.beatColor, countdown.beatSeconds);
    }),
    on(RoundFinished, 'round.view.onRoundFinished', (batch) => {
      const finish = ctx.data.round.finishConditions.find((row) => row.finish === batch.cols.finish[batch.count - 1]);
      if (finish) banner.show(finish.banner, finish.bannerColor, ctx.data.round.roundRules.finishHoldSeconds);
    }),
  ];
}
