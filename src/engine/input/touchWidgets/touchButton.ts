import { Circle, Container, Graphics, Text } from 'pixi.js';
import type { MessageBus } from '../../messaging/messageBus';
import { TouchButtonChanged } from '../../messaging/engineMessages';

export interface TouchButtonStyle {
  readonly radius: number;
  readonly color: string;
  readonly alpha: number;
  readonly pressedAlpha: number;
  readonly label: string;
  readonly labelColor: string;
  readonly fontFamily: string;
  readonly fontSize: number;
}

export interface TouchButton {
  readonly view: Container;
  setEnabledLook(enabled: boolean): void;
  /** Changes the button's text (one button, two meanings by context). */
  setLabel(text: string): void;
}

/** Round multi-touch button. Publishes TouchButtonChanged on press and release. */
export function createTouchButton(bus: MessageBus, widget: string, style: TouchButtonStyle): TouchButton {
  const view = new Container();
  const face = new Graphics().circle(0, 0, style.radius).fill({ color: style.color });
  face.alpha = style.alpha;
  const label = new Text({
    text: style.label,
    style: { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: '900', fill: style.labelColor },
  });
  label.anchor.set(0.5);
  view.addChild(face, label);
  view.eventMode = 'static';
  view.hitArea = new Circle(0, 0, style.radius * 1.2);

  let pointerId = -1;
  let enabledAlpha = style.alpha;
  const press = (id: number) => {
    if (pointerId !== -1) return;
    pointerId = id;
    face.alpha = style.pressedAlpha;
    bus.publish(TouchButtonChanged, { widget, down: 1 });
  };
  const release = (id: number) => {
    if (id !== pointerId) return;
    pointerId = -1;
    face.alpha = enabledAlpha;
    bus.publish(TouchButtonChanged, { widget, down: 0 });
  };
  view.on('pointerdown', (event) => press(event.pointerId));
  view.on('pointerup', (event) => release(event.pointerId));
  view.on('pointerupoutside', (event) => release(event.pointerId));

  return {
    view,
    setEnabledLook(enabled) {
      enabledAlpha = enabled ? style.alpha : style.alpha * 0.45;
      if (pointerId === -1) face.alpha = enabledAlpha;
    },
    setLabel(text) {
      label.text = text;
    },
  };
}
