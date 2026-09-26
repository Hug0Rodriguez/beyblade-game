import { FrameRendered, ViewportResized } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { createBanner } from '@engine/ui/banner';
import { CountdownBeat, RoundFinished, RoundStarted } from '../../../messages/roundMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { fillTemplate } from '../../../shared/units';

/** The drop-in countdown ("3 · 2 · 1 · RIOT!"), the Round label and the Finish callout. */
export function roundBannerHandlers(ctx: ViewContext): HandlerDef[] {
  const hud = ctx.data.hud.hud;
  const banner = createBanner(hud.font, hud.banner.fontSize, hud.banner.strokeColor);
  const label = createBanner(hud.font, hud.banner.smallFontSize, hud.banner.strokeColor);
  ctx.screens.layer('banner').addChild(banner.view, label.view);

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
    on(ViewportResized, 'round.view.layout', (batch) => {
      const width = batch.cols.width[batch.count - 1];
      const height = batch.cols.height[batch.count - 1];
      banner.view.position.set(width / 2, height * hud.banner.yRatio);
      banner.view.scale.set(Math.min(1, width / (hud.banner.fontSize * 8)));
      label.view.position.set(width / 2, height * hud.banner.smallYRatio);
    }),
    on(FrameRendered, 'round.view.animate', (batch) => {
      const dt = batch.cols.frameDt[batch.count - 1];
      banner.update(dt, hud.banner);
      label.update(dt, hud.banner);
    }),
  ];
}
