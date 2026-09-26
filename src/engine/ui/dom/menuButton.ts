import { el } from './el';

/** Menu button (`.menu-button`, styled in gui.css); calls `onPress` on tap or click. */
export function createDomMenuButton(label: string, onPress: () => void): HTMLButtonElement {
  const button = el('button', 'menu-button', label);
  button.type = 'button';
  button.addEventListener('click', onPress);
  return button;
}
