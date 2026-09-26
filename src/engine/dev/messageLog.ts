import type { DeliveryObserver } from '../messaging/messageBus';
import { createDevOverlay, onDevKey } from './devOverlay';

/** Live trace of message deliveries: per-type counts per second plus the most recent batches. */
export function createMessageLog(toggleKey: string, ignore: readonly string[]): DeliveryObserver {
  const overlay = createDevOverlay('left');
  const perSecond = new Map<string, number>();
  const recent: string[] = [];
  let shown = new Map<string, number>();

  onDevKey(toggleKey, () => overlay.toggle());
  setInterval(() => {
    shown = new Map(perSecond);
    perSecond.clear();
    if (!overlay.isOpen()) return;
    const rows = [...shown.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${String(n).padStart(5)}  ${name}`);
    overlay.element.textContent = `MESSAGES / s\n${rows.join('\n')}\n\nRECENT\n${recent.join('\n')}`;
  }, 1000);

  return (typeName, count, pass) => {
    perSecond.set(typeName, (perSecond.get(typeName) ?? 0) + count);
    if (ignore.includes(typeName)) return;
    recent.unshift(`pass ${pass}  ${typeName} ×${count}`);
    if (recent.length > 24) recent.length = 24;
  };
}
