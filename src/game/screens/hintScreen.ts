import { PointerKindDetected, StateEntered } from '@engine/messaging/engineMessages';
import { on } from '@engine/messaging/handlerRegistry';
import { el } from '@engine/ui/dom/el';
import type { ScreenData } from '../gameData/schema/screenData';
import type { DomainModule } from '../shared/domainContext';

type CopyKey = keyof ScreenData['copy'];

/**
 * A control hint along the bottom edge (HTML), shown while the gameFlow is in one of `flowStates`.
 * The keyboard or touch wording is picked once a touch pointer has been seen.
 */
export function createHintScreen(
  name: string,
  flowStates: readonly string[],
  copyKeys: { readonly keyboard: CopyKey; readonly touch: CopyKey },
): DomainModule<null> {
  return {
    name,
    createState: () => null,
    createHandlers: () => [],
    createViewHandlers: (ctx) => {
      const label = el('p', 'hint', ctx.data.screens.copy[copyKeys.keyboard]);
      label.hidden = true;
      ctx.gui.layer('hints').appendChild(label);
      return [
        on(StateEntered, `${name}.onFlowState`, (batch) => {
          for (let i = 0; i < batch.count; i++) {
            if (batch.cols.fsm[i] === ctx.data.screens.screens.fsm) label.hidden = !flowStates.includes(batch.cols.state[i]);
          }
        }),
        on(PointerKindDetected, `${name}.onPointerKind`, (batch) => {
          if (batch.cols.touch[batch.count - 1] === 1) label.textContent = ctx.data.screens.copy[copyKeys.touch];
        }),
      ];
    },
  };
}
