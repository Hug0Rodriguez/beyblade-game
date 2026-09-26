import '../../../gui/touch.css';
import { PointerKindDetected, StateEntered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { createDomTouchButton } from '@engine/input/touchWidgets/domTouchButton';
import { createDomJoystick } from '@engine/input/touchWidgets/domJoystick';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import { RevChanged, ShatterReady } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { rigOfSpinner } from '../../../shared/ids';

/**
 * On-screen controls (HTML): a floating stick and the action pad, shown once a touch is seen.
 * The pad is a grid: the primary button (DASH) is one tall slab, the others stack beside it,
 * and the chord button (SHATTER / REV) sits on top when it applies. CSS places the pad in the
 * gutter beside the dish (landscape) or under it (portrait).
 */
export function touchControlsViewHandlers(ctx: ViewContext): HandlerDef[] {
  const touch = ctx.data.spinner.touch;
  const glyphs = ctx.data.moves.moveGlyphs;
  const layer = ctx.gui.layer('touch');
  layer.classList.add('touch-layer');
  layer.style.display = 'none';
  layer.style.setProperty('--dish-half', String(50 / ctx.data.screens.screens.worldMargin));
  layer.style.setProperty('--pad-gap', `${touch.pad.gapPx}px`);
  layer.style.setProperty('--pad-margin', `${touch.pad.marginPx}px`);
  layer.style.setProperty('--pad-landscape-height', String(touch.pad.landscapeHeightRatio * 100));
  layer.style.setProperty('--pad-primary-ratio', `${touch.pad.primaryColumnRatio}fr`);
  layer.style.setProperty('--button-alpha', String(touch.buttonStyle.alpha));
  layer.style.setProperty('--button-pressed-alpha', String(touch.buttonStyle.pressedAlpha));
  layer.style.setProperty('--button-label-color', touch.buttonStyle.labelColor);
  layer.style.setProperty('--button-font-size', `${touch.buttonStyle.fontSize}px`);

  const joystick = createDomJoystick(ctx.bus, touch.joystick.widget, touch.joystick);
  layer.appendChild(joystick.zone);

  const pad = document.createElement('div');
  pad.className = 'pad';
  layer.appendChild(pad);
  const buttons = touch.buttons.map((spec) => {
    const button = createDomTouchButton(ctx.bus, spec.widget, {
      label: spec.label,
      color: spec.color,
      aimThresholdPx: spec.aimable ? touch.aim.thresholdPx : 0,
    });
    button.element.classList.add(`pad-${spec.slot}`);
    button.element.classList.toggle('hidden', spec.onlyWhenShatterReady === true);
    const glyph = glyphs.glyphs[glyphs.buttonGlyphs[spec.widget] ?? ''];
    if (glyph) button.setGlyph(glyph.path);
    pad.appendChild(button.element);
    return { spec, button };
  });

  /**
   * The inviting sign: the rival's move state names a glyph, its role names a counter, and the
   * answering button lights up in the rival's colour with their glyph in its corner.
   */
  const showCounterHint = (rivalMove: string) => {
    const rivalGlyph = Object.values(glyphs.glyphs).find((glyph) => glyph.moves.includes(rivalMove));
    const vulnerable = ctx.data.moves.moveTuning.vulnerableStates.includes(rivalMove);
    const sees = vulnerable ? 'vulnerable' : rivalGlyph?.role;
    const sign = sees ? glyphs.counters.find((counter) => counter.sees === sees) : undefined;
    const shown = sign && (rivalGlyph ?? glyphs.glyphs.dive);
    for (const { spec, button } of buttons) {
      if (sign && shown && spec.widget === sign.button) button.setHint(shown.path, shown.color);
      else button.setHint(null);
    }
  };

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
      button.element.classList.toggle('hidden', !(shatterReady || showRev));
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
        if (batch.cols.fsm[i] !== ctx.data.moves.moveTuning.fsm) continue;
        if (humanRigs.has(batch.cols.instance[i])) move = batch.cols.state[i];
        else showCounterHint(batch.cols.state[i]);
      }
      refreshChord();
    }),
    on(RevChanged, 'spinner.view.onRevChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) if (humanRigs.has(batch.cols.rigId[i])) rank = batch.cols.rank[i];
      refreshChord();
    }),
    on(PointerKindDetected, 'spinner.view.onPointerKind', (batch) => {
      if (batch.count > 0 && batch.cols.touch[batch.count - 1] === 1) layer.style.display = '';
    }),
  ];
}
