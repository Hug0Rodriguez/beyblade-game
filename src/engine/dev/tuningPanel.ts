import type { FolderApi, Pane } from 'tweakpane';

export interface TuningPanelOptions {
  readonly title: string;
  readonly toggleKey: string;
  readonly hide: readonly string[];
}

type Node = Record<string, unknown> | unknown[];

function bindTree(folder: FolderApi | Pane, node: Node): void {
  for (const [key, value] of Object.entries(node)) {
    if (value !== null && typeof value === 'object') {
      const child = folder.addFolder({ title: key, expanded: false });
      bindTree(child, value as Node);
    } else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
      folder.addBinding(node as Record<string, unknown>, key);
    }
  }
}

/**
 * Tweakpane over a live data tree: edits apply immediately to the running game.
 * "Copy JSON" puts the current tree on the clipboard to paste back into data files.
 */
export async function createTuningPanel(root: Record<string, unknown>, options: TuningPanelOptions): Promise<void> {
  const { Pane } = await import('tweakpane');
  const pane = new Pane({ title: options.title, expanded: true });
  pane.element.parentElement!.style.zIndex = '30';
  pane.element.parentElement!.style.maxHeight = '90vh';
  pane.element.parentElement!.style.overflowY = 'auto';
  pane.hidden = true;
  pane.addButton({ title: 'Copy JSON' }).on('click', () => {
    void navigator.clipboard.writeText(JSON.stringify(root, null, 2));
  });
  for (const [key, value] of Object.entries(root)) {
    if (options.hide.includes(key)) continue;
    const folder = pane.addFolder({ title: key, expanded: false });
    bindTree(folder, value as Node);
  }
  window.addEventListener('keydown', (event) => {
    if (event.code === options.toggleKey) pane.hidden = !pane.hidden;
  });
}
