import { el } from './el';

export interface DomBanner {
  readonly element: HTMLElement;
  show(text: string, color: string, seconds: number): void;
  hide(): void;
}

/**
 * Large centred text that pops in (CSS `gui-pop`, timed by `--banner-pop-seconds` / `--banner-pop-scale`)
 * and hides itself after `seconds` of real time (0 = stay).
 */
export function createDomBanner(className: string): DomBanner {
  const element = el('div', `banner ${className}`);
  element.hidden = true;
  let timer = 0;
  return {
    element,
    show(text, color, seconds) {
      element.textContent = text;
      element.style.color = color;
      element.hidden = false;
      element.classList.remove('pop');
      void element.offsetWidth; // restart the animation
      element.classList.add('pop');
      window.clearTimeout(timer);
      if (seconds > 0) timer = window.setTimeout(() => (element.hidden = true), seconds * 1000);
    },
    hide() {
      window.clearTimeout(timer);
      element.hidden = true;
    },
  };
}
