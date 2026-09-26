import type { MessageBus } from '../../messaging/messageBus';
import { PointerKindDetected } from '../../messaging/engineMessages';

/**
 * Publishes PointerKindDetected once touch is known: immediately on coarse-pointer devices
 * (phones, tablets), otherwise when the first touch pointer goes down.
 */
export function attachPointerDevice(bus: MessageBus, target: HTMLElement): void {
  let touchSeen = window.matchMedia('(pointer: coarse)').matches;
  if (touchSeen) bus.publish(PointerKindDetected, { touch: 1 });
  target.addEventListener('pointerdown', (event) => {
    if (touchSeen || event.pointerType !== 'touch') return;
    touchSeen = true;
    bus.publish(PointerKindDetected, { touch: 1 });
  });
  // Block browser gestures (pinch, double-tap zoom, pull-to-refresh) over the canvas.
  const block = (event: Event) => event.preventDefault();
  target.addEventListener('touchstart', block, { passive: false });
  target.addEventListener('touchmove', block, { passive: false });
  target.addEventListener('gesturestart', block);
}
