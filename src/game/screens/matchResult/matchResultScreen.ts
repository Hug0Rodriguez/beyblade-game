import { Container, Graphics } from 'pixi.js';
import { ViewportResized } from '@engine/messaging/engineMessages';
import { on } from '@engine/messaging/handlerRegistry';
import { createMenuButton } from '@engine/ui/menuButton';
import { RematchRequested, TitleRequested } from '../../messages/flowMessages';
import { MatchWon } from '../../messages/matchMessages';
import type { DomainModule } from '../../shared/domainContext';
import { fillTemplate } from '../../shared/units';
import { screenText } from '../screenText';

/** Match Result: the winner, and the way back in. */
export const matchResultScreen: DomainModule<null> = {
  name: 'screens.matchResult',
  createState: () => null,
  createHandlers: () => [],
  createViewHandlers: (ctx) => {
    const hud = ctx.data.hud.hud;
    const copy = ctx.data.screens.copy;
    const layout = hud.screenLayout;
    const root = new Container();
    const backdrop = new Graphics();
    const winner = screenText(hud, '', layout.resultTitleSize, hud.panel.textColor);
    const keyHint = screenText(hud, copy.rematchKeyHint, hud.hint.fontSize, hud.hint.color);
    const buttonStyle = { ...hud.font, ...hud.menuButton };
    const rematch = createMenuButton(copy.rematch, buttonStyle, () => ctx.publish(RematchRequested, {}));
    const toTitle = createMenuButton(copy.toTitle, buttonStyle, () => ctx.publish(TitleRequested, {}));
    root.addChild(backdrop, winner, rematch, toTitle, keyHint);
    ctx.screens.layer('matchResult').addChild(root);

    return [
      on(MatchWon, 'screens.matchResult.onMatchWon', (batch) => {
        winner.text = fillTemplate(copy.matchWinner, { name: batch.cols.name[batch.count - 1] });
      }),
      on(ViewportResized, 'screens.matchResult.layout', (batch) => {
        const width = batch.cols.width[batch.count - 1];
        const height = batch.cols.height[batch.count - 1];
        backdrop.clear().rect(0, 0, width, height).fill({ color: layout.backdropColor, alpha: layout.backdropAlpha });
        winner.style.wordWrapWidth = width - 32;
        winner.position.set(width / 2, height * layout.resultTitleYRatio);
        const gap = hud.menuButton.height + layout.buttonGap;
        rematch.position.set(width / 2, height * layout.resultButtonsYRatio);
        toTitle.position.set(width / 2, height * layout.resultButtonsYRatio + gap);
        keyHint.position.set(width / 2, height * layout.resultButtonsYRatio + gap * 2);
      }),
    ];
  },
};
