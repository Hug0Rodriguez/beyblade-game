import { JoystickMoved, KeyChanged, TouchAimChanged, TouchButtonChanged } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import type { DomainContext } from '../../../shared/domainContext';
import { commandColumns } from '../rules/keyBindings';
import type { SpinnerState } from '../state/spinnerState';

type WritableColumn = { [row: number]: number };

/** Raw device messages → the human Spinner rows' input columns. */
export function humanInputHandlers(state: SpinnerState, ctx: DomainContext): HandlerDef[] {
  const humans = state.humans;

  const writeAll = (column: string, value: number) => {
    const target = humans.cols[column as keyof typeof humans.cols] as unknown as WritableColumn;
    for (let row = 0; row < humans.count; row++) target[row] = value;
  };

  return [
    on(KeyChanged, 'spinner.onKeyChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const command = state.keyCommands[batch.cols.key[i]];
        if (!command) continue;
        const { column, pressOnly } = commandColumns[command];
        const down = batch.cols.down[i];
        if (pressOnly && down === 0) continue;
        writeAll(column, down);
      }
    }),
    on(JoystickMoved, 'spinner.onJoystickMoved', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.widget[i] !== ctx.data.spinner.touch.joystick.widget) continue;
        writeAll('joyX', batch.cols.x[i]);
        writeAll('joyY', batch.cols.y[i]);
      }
    }),
    // Dragging a held DASH or HOOK aims it during the wind-up; release goes back to the steer.
    on(TouchAimChanged, 'spinner.onTouchAimChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const active = batch.cols.active[i] === 1;
        writeAll('aimX', active ? batch.cols.x[i] : 0);
        writeAll('aimY', active ? batch.cols.y[i] : 0);
      }
    }),
    // A button press queues its command; SHATTER presses Dash and Whirl together.
    on(TouchButtonChanged, 'spinner.onTouchButtonChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const button = ctx.data.spinner.touch.buttons.find((entry) => entry.widget === batch.cols.widget[i]);
        if (!button || batch.cols.down[i] === 0) continue;
        if (button.command === 'shatter') {
          writeAll(commandColumns.dash.column, 1);
          writeAll(commandColumns.whirl.column, 1);
        } else {
          writeAll(commandColumns[button.command].column, 1);
        }
      }
    }),
  ];
}
