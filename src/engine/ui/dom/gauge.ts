import { el } from './el';

export interface DomGauge {
  readonly element: HTMLElement;
  set(ratio: number): void;
  setFillColor(color: string): void;
}

/** Horizontal bar (`.gauge` > `.gauge-fill`); `set` takes 0..1. `flip` fills right-to-left. */
export function createDomGauge(flip = false): DomGauge {
  const element = el('div', flip ? 'gauge flip' : 'gauge');
  const fill = el('div', 'gauge-fill');
  element.appendChild(fill);
  return {
    element,
    set(ratio) {
      fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    },
    setFillColor(color) {
      fill.style.background = color;
    },
  };
}
