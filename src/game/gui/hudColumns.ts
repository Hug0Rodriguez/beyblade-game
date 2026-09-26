import { el } from '@engine/ui/dom/el';

/**
 * The HUD stacks one column per Spinner slot at the top corners (slot 0 left, slot 1 right).
 * Views append their block to the column; CSS `order` keeps panel → Rev → points.
 */
export function hudColumn(layer: HTMLElement, slot: number): HTMLElement {
  const existing = layer.querySelector<HTMLElement>(`.hud-column[data-slot="${slot}"]`);
  if (existing) return existing;
  const column = el('div', `hud-column ${slot % 2 === 0 ? 'side-left' : 'side-right'}`);
  column.dataset.slot = String(slot);
  layer.appendChild(column);
  return column;
}
