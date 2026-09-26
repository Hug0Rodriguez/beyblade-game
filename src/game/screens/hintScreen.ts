import { PointerKindDetected, StateEntered, ViewportResized } from '@engine/messaging/engineMessages';
import { on } from '@engine/messaging/handlerRegistry';
import type { ScreenData } from '../gameData/schema/screenData';
import type { DomainModule } from '../shared/domainContext';
import { screenText } from './screenText';

type CopyKey = keyof ScreenData['copy'];

/**
 * A control hint along the bottom edge, shown while the gameFlow is in one of `flowStates`.
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
      const hint = ctx.data.hud.hud.hint;
      const label = screenText(ctx.data.hud.hud, ctx.data.screens.copy[copyKeys.keyboard], hint.fontSize, hint.color);
      label.anchor.set(0.5, 1);
      label.visible = false;
      ctx.screens.layer('hints').addChild(label);
      return [
        on(StateEntered, `${name}.onFlowState`, (batch) => {
          for (let i = 0; i < batch.count; i++) {
            if (batch.cols.fsm[i] === ctx.data.screens.screens.fsm) label.visible = flowStates.includes(batch.cols.state[i]);
          }
        }),
        on(PointerKindDetected, `${name}.onPointerKind`, (batch) => {
          if (batch.cols.touch[batch.count - 1] === 1) label.text = ctx.data.screens.copy[copyKeys.touch];
        }),
        on(ViewportResized, `${name}.layout`, (batch) => {
          const width = batch.cols.width[batch.count - 1];
          label.style.wordWrapWidth = width - 32;
          label.position.set(width / 2, batch.cols.height[batch.count - 1] - hint.bottomMargin);
        }),
      ];
    },
  };
}
