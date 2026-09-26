import { Container, Graphics, Rectangle, type FederatedPointerEvent } from 'pixi.js';
import { clampLengthInto, type Vec2 } from '@shared/math/vec2';
import type { MessageBus } from '../../messaging/messageBus';
import { JoystickMoved } from '../../messaging/engineMessages';

export interface VirtualJoystickStyle {
  readonly radius: number;
  readonly knobRadius: number;
  readonly deadzone: number;
  readonly baseColor: string;
  readonly baseAlpha: number;
  readonly knobColor: string;
  readonly knobAlpha: number;
}

export interface VirtualJoystick {
  readonly view: Container;
  /** Screen-space rectangle that captures touches; the stick appears where the finger lands. */
  setZone(x: number, y: number, width: number, height: number): void;
  setRestPosition(x: number, y: number): void;
}

/** Floating thumbstick. Publishes JoystickMoved with a -1..1 vector (deadzone applied). */
export function createVirtualJoystick(bus: MessageBus, widget: string, style: VirtualJoystickStyle): VirtualJoystick {
  const view = new Container();
  const zone = new Container();
  zone.eventMode = 'static';
  const base = new Graphics().circle(0, 0, style.radius).fill({ color: style.baseColor, alpha: style.baseAlpha });
  base.circle(0, 0, style.radius).stroke({ color: style.knobColor, alpha: style.knobAlpha * 0.5, width: 2 });
  const knob = new Graphics().circle(0, 0, style.knobRadius).fill({ color: style.knobColor, alpha: style.knobAlpha });
  view.addChild(zone, base, knob);

  const rest: Vec2 = { x: 0, y: 0 };
  const offset: Vec2 = { x: 0, y: 0 };
  let pointerId = -1;

  const place = (x: number, y: number) => {
    base.position.set(x, y);
    knob.position.set(x, y);
  };
  const publish = (x: number, y: number) => {
    const magnitude = Math.sqrt(x * x + y * y);
    const scale = magnitude < style.deadzone ? 0 : (magnitude - style.deadzone) / (1 - style.deadzone) / magnitude;
    bus.publish(JoystickMoved, { widget, x: x * scale, y: y * scale });
  };
  const move = (event: FederatedPointerEvent) => {
    if (event.pointerId !== pointerId) return;
    clampLengthInto(offset, event.global.x - base.x, event.global.y - base.y, style.radius);
    knob.position.set(base.x + offset.x, base.y + offset.y);
    publish(offset.x / style.radius, offset.y / style.radius);
  };
  const release = (event: FederatedPointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = -1;
    place(rest.x, rest.y);
    publish(0, 0);
  };

  zone.on('pointerdown', (event) => {
    if (pointerId !== -1) return;
    pointerId = event.pointerId;
    place(event.global.x, event.global.y);
  });
  zone.on('globalpointermove', move);
  zone.on('pointerup', release);
  zone.on('pointerupoutside', release);

  return {
    view,
    setZone(x, y, width, height) {
      zone.hitArea = new Rectangle(x, y, width, height);
    },
    setRestPosition(x, y) {
      rest.x = x;
      rest.y = y;
      if (pointerId === -1) place(x, y);
    },
  };
}
