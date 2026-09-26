import type { MessageBus } from '../../messaging/messageBus';
import { KeyChanged } from '../../messaging/engineMessages';

/**
 * Publishes KeyChanged for the watched key codes. `key` in the message is the index into
 * `watchedCodes`, so consumers map it back through the same list.
 */
export function attachKeyboardDevice(bus: MessageBus, watchedCodes: readonly string[]): () => void {
  const held = new Set<number>();

  const onKey = (event: KeyboardEvent, down: boolean): void => {
    const key = watchedCodes.indexOf(event.code);
    if (key === -1) return;
    event.preventDefault();
    if (down === held.has(key)) return;
    if (down) held.add(key);
    else held.delete(key);
    bus.publish(KeyChanged, { key, down: down ? 1 : 0 });
  };
  const keydown = (event: KeyboardEvent) => onKey(event, true);
  const keyup = (event: KeyboardEvent) => onKey(event, false);
  const blur = () => {
    for (const key of held) bus.publish(KeyChanged, { key, down: 0 });
    held.clear();
  };

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', blur);
  };
}
