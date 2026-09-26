import { Container } from 'pixi.js';
import { PointerKindDetected, StateEntered, ViewportResized } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { createTouchButton } from '@engine/input/touchWidgets/touchButton';
import { createVirtualJoystick } from '@engine/input/touchWidgets/virtualJoystick';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import { RevChanged, ShatterReady } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { rigOfSpinner } from '../../../shared/ids';

/**
 * On-screen controls: a floating joystick + the action buttons (shown once a touch is seen).
 * The chord button reads SHATTER when the Shatter is ready and REV when it would Rev Cancel.
 */
export function touchControlsViewHandlers(ctx: ViewContext): HandlerDef[] {
  const touch = ctx.data.spinner.touch;
  const font = ctx.data.hud.hud.font;

  const controls = new Container();
  controls.visible = false;
  ctx.screens.layer('touch').addChild(controls);

  const joystick = createVirtualJoystick(ctx.bus, touch.joystick.widget, touch.joystick);
  controls.addChild(joystick.view);
  const buttons = touch.buttons.map((spec) => {
    const button = createTouchButton(ctx.bus, spec.widget, {
      radius: spec.radius,
      color: spec.color,
      alpha: touch.buttonStyle.alpha,
      pressedAlpha: touch.buttonStyle.pressedAlpha,
      label: spec.label,
      labelColor: touch.buttonStyle.labelColor,
      fontFamily: font.fontFamily,
      fontSize: touch.buttonStyle.fontSize,
    });
    button.view.visible = !spec.onlyWhenShatterReady;
    controls.addChild(button.view);
    return { spec, button };
  });

  const humanRigs = new Set<number>();
  let shatterReady = false;
  let move = '';
  let rank = 0;

  /** The chord button: visible and labelled by what Dash + Whirl would do right now. */
  const refreshChord = () => {
    const cancel = ctx.data.moves.moveTuning.revCancel;
    const canCancel = cancel.states.includes(move) && rank >= cancel.rankCost;
    for (const { spec, button } of buttons) {
      if (!spec.onlyWhenShatterReady) continue;
      const showRev = canCancel && spec.revLabel !== undefined;
      button.view.visible = shatterReady || showRev;
      button.setLabel(shatterReady || !showRev ? spec.label : (spec.revLabel ?? spec.label));
    }
  };

  return [
    on(SpinnerAssigned, 'spinner.view.onSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) if (batch.cols.controller[i] === 'human') humanRigs.add(rigOfSpinner(batch.cols.spinnerId[i]));
    }),
    on(ShatterReady, 'spinner.view.onShatterReady', (batch) => {
      for (let i = 0; i < batch.count; i++) if (humanRigs.has(batch.cols.rigId[i])) shatterReady = batch.cols.ready[i] === 1;
      refreshChord();
    }),
    on(StateEntered, 'spinner.view.onMoveState', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.fsm[i] === ctx.data.moves.moveTuning.fsm && humanRigs.has(batch.cols.instance[i])) move = batch.cols.state[i];
      }
      refreshChord();
    }),
    on(RevChanged, 'spinner.view.onRevChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) if (humanRigs.has(batch.cols.rigId[i])) rank = batch.cols.rank[i];
      refreshChord();
    }),
    on(PointerKindDetected, 'spinner.view.onPointerKind', (batch) => {
      if (batch.count > 0 && batch.cols.touch[batch.count - 1] === 1) controls.visible = true;
    }),
    on(ViewportResized, 'spinner.view.layout', (batch) => {
      const width = batch.cols.width[batch.count - 1];
      const height = batch.cols.height[batch.count - 1];
      const { zone, rest } = touch.joystick;
      joystick.setZone(zone.x * width, zone.y * height, zone.width * width, zone.height * height);
      joystick.setRestPosition(rest.x * width, rest.y * height);
      for (const { spec, button } of buttons) button.view.position.set(spec.x * width, spec.y * height);
    }),
  ];
}
