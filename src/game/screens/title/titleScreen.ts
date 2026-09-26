import { PointerKindDetected } from '@engine/messaging/engineMessages';
import { on } from '@engine/messaging/handlerRegistry';
import { el } from '@engine/ui/dom/el';
import { createDomMenuButton } from '@engine/ui/dom/menuButton';
import { StartRequested } from '../../messages/flowMessages';
import type { DomainModule } from '../../shared/domainContext';

/** Title (HTML): the name, the promise, and the way in (a button, or any action key). */
export const titleScreen: DomainModule<null> = {
  name: 'screens.title',
  createState: () => null,
  createHandlers: () => [],
  createViewHandlers: (ctx) => {
    const copy = ctx.data.screens.copy;
    const root = el('div', 'title-screen');
    const title = el('h1', '', copy.title);
    const tagline = el('p', 'tagline', copy.tagline);
    const start = createDomMenuButton(copy.startButton, () => ctx.publish(StartRequested, {}));
    const prompt = el('p', 'prompt gui-pulse', copy.titlePromptKeyboard);
    const controls = el('p', 'controls', copy.controlsKeyboard);
    root.append(title, tagline, start, prompt, controls);
    ctx.gui.layer('title').appendChild(root);

    return [
      on(PointerKindDetected, 'screens.title.onPointerKind', (batch) => {
        if (batch.cols.touch[batch.count - 1] !== 1) return;
        prompt.textContent = copy.titlePromptTouch;
        controls.textContent = copy.controlsTouch;
      }),
    ];
  },
};
