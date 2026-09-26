import { StepTicked } from '@engine/messaging/engineMessages';
import type { MessageType } from '@engine/messaging/defineMessage';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { length } from '@shared/math/vec2';
import { RematchRequested, StartRequested } from '../../../messages/flowMessages';
import { SpinnerCommandIssued } from '../../../messages/spinnerMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { isActive } from '../../../shared/flowWatch';
import type { SpinnerState } from '../state/spinnerState';

/** Menu messages a button press can publish (named in flow/activity.json → menus). */
const menuMessages: Readonly<Record<string, MessageType<Record<string, never>>>> = { StartRequested, RematchRequested };

/**
 * Each step, every human Spinner's input becomes one SpinnerCommandIssued (while fighting),
 * or a menu message (on menu screens). Presses are consumed either way.
 */
export function readHumanCommandsHandler(state: SpinnerState, ctx: DomainContext): HandlerDef {
  return on(StepTicked, 'spinner.readHumanCommands', () => {
    const h = state.humans.cols;
    const fighting = isActive(state.flow, ctx.data.flow.activity.commands);
    const menu = ctx.data.flow.activity.menus[state.flow.state];
    for (let row = 0; row < state.humans.count; row++) {
      if (fighting) {
        let steerX = h.steerRight[row] - h.steerLeft[row];
        let steerY = h.steerDown[row] - h.steerUp[row];
        const keyLength = length(steerX, steerY);
        if (keyLength > 1) {
          steerX /= keyLength;
          steerY /= keyLength;
        }
        if (length(h.joyX[row], h.joyY[row]) > 0) {
          steerX = h.joyX[row];
          steerY = h.joyY[row];
        }
        ctx.publish(SpinnerCommandIssued, {
          spinnerId: state.humans.ids[row],
          steerX,
          steerY,
          aimX: h.aimX[row],
          aimY: h.aimY[row],
          dash: h.dashQueued[row],
          pop: h.popQueued[row],
          whirl: h.whirlQueued[row],
          hook: h.hookQueued[row],
        });
      } else if (menu) {
        const pressed = { dash: h.dashQueued[row], pop: h.popQueued[row], whirl: h.whirlQueued[row], hook: h.hookQueued[row], confirm: h.confirmQueued[row] };
        const message = menuMessages[menu.message];
        if (message && menu.commands.some((command) => pressed[command as keyof typeof pressed] === 1)) ctx.publish(message, {});
      }
      h.dashQueued[row] = 0;
      h.popQueued[row] = 0;
      h.whirlQueued[row] = 0;
      h.hookQueued[row] = 0;
      h.confirmQueued[row] = 0;
    }
  });
}
