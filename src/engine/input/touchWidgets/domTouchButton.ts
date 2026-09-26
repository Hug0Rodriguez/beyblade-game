import type { MessageBus } from '../../messaging/messageBus';
import { TouchAimChanged, TouchButtonChanged } from '../../messaging/engineMessages';

export interface DomTouchButtonStyle {
  readonly label: string;
  readonly color: string;
  /** Dragging the finger past this many pixels aims the move (TouchAimChanged). */
  readonly aimThresholdPx?: number;
}

export interface DomTouchButton {
  readonly element: HTMLButtonElement;
  setEnabledLook(enabled: boolean): void;
  /** Changes the button's word (one button, two meanings by context). */
  setLabel(text: string): void;
  /** The move's glyph, as SVG path data drawn in a 0..24 box. */
  setGlyph(path: string): void;
  /** Lights the button as the answer to the rival's move: their glyph and colour, or null to clear. */
  setHint(path: string | null, color?: string): void;
}

/**
 * Multi-touch action button in the DOM. Fires TouchButtonChanged on press and release.
 * With an aim threshold, dragging the finger publishes TouchAimChanged so the move can be aimed
 * during its wind-up. Up, cancel and lost capture all release, so iOS can't leave it stuck.
 */
export function createDomTouchButton(bus: MessageBus, widget: string, style: DomTouchButtonStyle): DomTouchButton {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'touch-button';
  element.dataset.widget = widget;
  element.style.setProperty('--button-color', style.color);
  const glyph = svg();
  const word = document.createElement('span');
  word.textContent = style.label;
  const hint = svg();
  hint.classList.add('hint');
  element.append(glyph, word, hint);

  let pointerId = -1;
  let pressX = 0;
  let pressY = 0;
  let aiming = false;
  const threshold = style.aimThresholdPx ?? 0;

  const press = (event: PointerEvent) => {
    if (pointerId !== -1 || !capture(element, event.pointerId)) return;
    pointerId = event.pointerId;
    pressX = event.clientX;
    pressY = event.clientY;
    element.classList.add('pressed');
    bus.publish(TouchButtonChanged, { widget, down: 1 });
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || threshold <= 0) return;
    const dx = event.clientX - pressX;
    const dy = event.clientY - pressY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < threshold) return;
    aiming = true;
    bus.publish(TouchAimChanged, { widget, x: dx / distance, y: dy / distance, active: 1 });
  };
  const release = () => {
    if (pointerId === -1) return;
    pointerId = -1;
    element.classList.remove('pressed');
    if (aiming) bus.publish(TouchAimChanged, { widget, x: 0, y: 0, active: 0 });
    aiming = false;
    bus.publish(TouchButtonChanged, { widget, down: 0 });
  };
  const onEnd = (event: PointerEvent) => {
    if (event.pointerId === pointerId) release();
  };
  element.addEventListener('pointerdown', press);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', onEnd);
  element.addEventListener('pointercancel', onEnd);
  element.addEventListener('lostpointercapture', onEnd);
  element.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });
  window.addEventListener('blur', release);

  return {
    element,
    setEnabledLook(enabled) {
      element.classList.toggle('disabled', !enabled);
    },
    setLabel(text) {
      word.textContent = text;
    },
    setGlyph(path) {
      setPath(glyph, path);
    },
    setHint(path, color) {
      element.classList.toggle('hinted', path !== null);
      if (path === null) return;
      setPath(hint, path);
      if (color) element.style.setProperty('--hint-color', color);
      hint.style.stroke = color ?? 'currentColor';
    },
  };
}

const SVG = 'http://www.w3.org/2000/svg';

function svg(): SVGSVGElement {
  const node = document.createElementNS(SVG, 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  return node;
}

function setPath(node: SVGSVGElement, path: string): void {
  node.replaceChildren();
  const shape = document.createElementNS(SVG, 'path');
  shape.setAttribute('d', path);
  node.appendChild(shape);
}

/** Pointer capture can refuse (synthetic events, a pointer already gone); the button then ignores the press. */
function capture(element: HTMLElement, pointerId: number): boolean {
  try {
    element.setPointerCapture(pointerId);
    return true;
  } catch {
    return false;
  }
}
