/** A fixed, toggleable DOM panel used by the dev tools. */
export interface DevOverlay {
  readonly element: HTMLElement;
  toggle(): boolean;
  isOpen(): boolean;
}

export function createDevOverlay(side: 'left' | 'right'): DevOverlay {
  const element = document.createElement('pre');
  Object.assign(element.style, {
    position: 'fixed',
    top: '8px',
    [side]: '8px',
    maxHeight: '70vh',
    maxWidth: '46vw',
    overflow: 'auto',
    margin: '0',
    padding: '8px 10px',
    background: 'rgba(8, 10, 20, 0.86)',
    color: '#bfe3ff',
    font: '11px/1.35 ui-monospace, Menlo, monospace',
    borderRadius: '6px',
    zIndex: '20',
    display: 'none',
    pointerEvents: 'none',
  });
  document.body.appendChild(element);
  return {
    element,
    toggle() {
      const open = element.style.display === 'none';
      element.style.display = open ? 'block' : 'none';
      return open;
    },
    isOpen: () => element.style.display !== 'none',
  };
}

export function onDevKey(code: string, action: () => void): void {
  window.addEventListener('keydown', (event) => {
    if (event.code === code) action();
  });
}
