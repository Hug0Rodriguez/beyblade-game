import type { MessageBus } from '../../messaging/messageBus';
import { JoystickMoved } from '../../messaging/engineMessages';

export interface DomJoystickStyle {
  readonly radius: number;
  readonly knobRadius: number;
  readonly deadzone: number;
  readonly baseColor: string;
  readonly baseAlpha: number;
  readonly knobColor: string;
  readonly knobAlpha: number;
}

export interface DomJoystick {
  /** The capture zone; position and size it with CSS. The stick appears where the finger lands. */
  readonly zone: HTMLElement;
}

/**
 * Floating thumbstick in the DOM. Publishes JoystickMoved with a -1..1 vector (deadzone applied).
 * Every way a touch can end (up, cancel, lost capture, page hidden) releases the stick, so a
 * cancelled touch can never leave it dead.
 */
export function createDomJoystick(bus: MessageBus, widget: string, style: DomJoystickStyle): DomJoystick {
  const zone = document.createElement('div');
  zone.className = 'stick-zone';
  const base = document.createElement('div');
  base.className = 'stick-base';
  const knob = document.createElement('div');
  knob.className = 'stick-knob';
  base.appendChild(knob);
  zone.appendChild(base);
  zone.style.setProperty('--stick-radius', String(style.radius));
  zone.style.setProperty('--stick-knob-radius', String(style.knobRadius));
  zone.style.setProperty('--stick-base-color', style.baseColor);
  zone.style.setProperty('--stick-base-alpha', String(style.baseAlpha));
  zone.style.setProperty('--stick-knob-color', style.knobColor);
  zone.style.setProperty('--stick-knob-alpha', String(style.knobAlpha));

  let pointerId = -1;
  let baseX = 0;
  let baseY = 0;
  const place = (x: number, y: number) => {
    baseX = x;
    baseY = y;
    base.style.transform = `translate(${x}px, ${y}px)`;
    knob.style.transform = `translate(${style.radius}px, ${style.radius}px)`;
  };
  const publish = (x: number, y: number) => {
    const magnitude = Math.sqrt(x * x + y * y);
    const scale = magnitude < style.deadzone ? 0 : (magnitude - style.deadzone) / (1 - style.deadzone) / magnitude;
    bus.publish(JoystickMoved, { widget, x: x * scale, y: y * scale });
  };
  const rest = () => {
    const rect = zone.getBoundingClientRect();
    place(rect.width / 2, rect.height * 0.6);
  };
  const release = () => {
    if (pointerId === -1) return;
    pointerId = -1;
    rest();
    publish(0, 0);
  };

  zone.addEventListener('pointerdown', (event) => {
    if (pointerId !== -1 || !capture(zone, event.pointerId)) return;
    pointerId = event.pointerId;
    const rect = zone.getBoundingClientRect();
    place(event.clientX - rect.left, event.clientY - rect.top);
    event.preventDefault();
  });
  zone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const rect = zone.getBoundingClientRect();
    let dx = event.clientX - rect.left - baseX;
    let dy = event.clientY - rect.top - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > style.radius) {
      dx *= style.radius / distance;
      dy *= style.radius / distance;
    }
    knob.style.transform = `translate(${style.radius + dx}px, ${style.radius + dy}px)`;
    publish(dx / style.radius, dy / style.radius);
  });
  const onEnd = (event: PointerEvent) => {
    if (event.pointerId === pointerId) release();
  };
  zone.addEventListener('pointerup', onEnd);
  zone.addEventListener('pointercancel', onEnd);
  zone.addEventListener('lostpointercapture', onEnd);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });
  window.addEventListener('blur', release);
  new ResizeObserver(() => {
    if (pointerId === -1) rest();
  }).observe(zone);

  return { zone };
}

/** Pointer capture can refuse (synthetic events, a pointer already gone); the stick then ignores the press. */
function capture(element: HTMLElement, pointerId: number): boolean {
  try {
    element.setPointerCapture(pointerId);
    return true;
  } catch {
    return false;
  }
}
