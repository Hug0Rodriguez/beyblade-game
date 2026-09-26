import { Container } from 'pixi.js';
import { FrameRendered, PointerKindDetected, ViewportResized } from '@engine/messaging/engineMessages';
import { on } from '@engine/messaging/handlerRegistry';
import { createMenuButton } from '@engine/ui/menuButton';
import { StartRequested } from '../../messages/flowMessages';
import type { DomainModule } from '../../shared/domainContext';
import { screenText } from '../screenText';

/** Title: the name, the promise, and the way in (a button, or any action key). */
export const titleScreen: DomainModule<null> = {
  name: 'screens.title',
  createState: () => null,
  createHandlers: () => [],
  createViewHandlers: (ctx) => {
    const hud = ctx.data.hud.hud;
    const copy = ctx.data.screens.copy;
    const layout = hud.screenLayout;
    const root = new Container();
    const title = screenText(hud, copy.title, layout.titleSize, layout.titleColor);
    const tagline = screenText(hud, copy.tagline, layout.taglineSize, layout.taglineColor);
    const prompt = screenText(hud, copy.titlePromptKeyboard, layout.promptSize, layout.promptColor);
    const controls = screenText(hud, copy.controlsKeyboard, layout.controlsSize, hud.hint.color);
    const start = createMenuButton(copy.startButton, { ...hud.font, ...hud.menuButton }, () => ctx.publish(StartRequested, {}));
    root.addChild(title, tagline, start, prompt, controls);
    ctx.screens.layer('title').addChild(root);
    let time = 0;

    return [
      on(PointerKindDetected, 'screens.title.onPointerKind', (batch) => {
        if (batch.cols.touch[batch.count - 1] !== 1) return;
        prompt.text = copy.titlePromptTouch;
        controls.text = copy.controlsTouch;
      }),
      on(ViewportResized, 'screens.title.layout', (batch) => {
        const width = batch.cols.width[batch.count - 1];
        const height = batch.cols.height[batch.count - 1];
        title.scale.set(Math.min(1, (width - 32) / title.width));
        for (const text of [tagline, prompt, controls]) text.style.wordWrapWidth = width - 32;
        title.position.set(width / 2, height * layout.titleYRatio);
        tagline.position.set(width / 2, height * layout.taglineYRatio);
        start.position.set(width / 2, height * layout.startButtonYRatio);
        prompt.position.set(width / 2, height * layout.promptYRatio);
        controls.position.set(width / 2, height * layout.controlsYRatio);
      }),
      on(FrameRendered, 'screens.title.animate', (batch) => {
        time += batch.cols.frameDt[batch.count - 1];
        prompt.alpha = 0.55 + 0.45 * Math.abs(Math.sin(time * layout.promptPulsePerSecond));
      }),
    ];
  },
};
