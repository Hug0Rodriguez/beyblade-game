import { on } from '@engine/messaging/handlerRegistry';
import { el } from '@engine/ui/dom/el';
import { createDomMenuButton } from '@engine/ui/dom/menuButton';
import { RematchRequested, TitleRequested } from '../../messages/flowMessages';
import { MatchWon } from '../../messages/matchMessages';
import type { DomainModule } from '../../shared/domainContext';
import { fillTemplate } from '../../shared/units';

/** Match Result (HTML): the winner, and the way back in. */
export const matchResultScreen: DomainModule<null> = {
  name: 'screens.matchResult',
  createState: () => null,
  createHandlers: () => [],
  createViewHandlers: (ctx) => {
    const copy = ctx.data.screens.copy;
    const root = el('div', 'match-result');
    const winner = el('h2');
    const rematch = createDomMenuButton(copy.rematch, () => ctx.publish(RematchRequested, {}));
    const toTitle = createDomMenuButton(copy.toTitle, () => ctx.publish(TitleRequested, {}));
    const keyHint = el('p', 'key-hint', copy.rematchKeyHint);
    root.append(winner, rematch, toTitle, keyHint);
    ctx.gui.layer('matchResult').appendChild(root);

    return [
      on(MatchWon, 'screens.matchResult.onMatchWon', (batch) => {
        winner.textContent = fillTemplate(copy.matchWinner, { name: batch.cols.name[batch.count - 1] });
      }),
    ];
  },
};
