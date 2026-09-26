import './gui.css';
import type { MessageBatch } from '../messaging/defineMessage';
import { StateEntered } from '../messaging/engineMessages';
import { on, type HandlerDef } from '../messaging/handlerRegistry';
import type { ScreenLayerSpec } from '../screens/screenHost';

export interface GuiHostConfig {
  /** Which FSM's states select the visible layers. */
  readonly fsm: string;
  readonly layers: readonly ScreenLayerSpec[];
  /** state → layer names visible in that state. */
  readonly visibleIn: Readonly<Record<string, readonly string[]>>;
  /** CSS custom properties written on the GUI root (fonts, colours) so CSS and data agree. */
  readonly cssVars: Readonly<Record<string, string>>;
}

/**
 * The HTML side of the screen: one `<section>` per "gui" layer, stacked over the canvas.
 * Layers only stack; the views inside them lay themselves out with CSS.
 */
export interface GuiHost {
  readonly root: HTMLElement;
  layer(name: string): HTMLElement;
  handlers(): HandlerDef[];
}

export function createGuiHost(parent: HTMLElement, config: GuiHostConfig): GuiHost {
  const root = document.createElement('div');
  root.id = 'gui';
  for (const [name, value] of Object.entries(config.cssVars)) root.style.setProperty(name, value);
  parent.appendChild(root);

  const layers = new Map<string, HTMLElement>();
  for (const spec of config.layers) {
    if (spec.space !== 'gui') continue;
    const layer = document.createElement('section');
    layer.className = 'gui-layer';
    layer.dataset.layer = spec.name;
    layer.hidden = true;
    root.appendChild(layer);
    layers.set(spec.name, layer);
  }

  const onStateEntered = (batch: MessageBatch<typeof StateEntered.schema>) => {
    for (let i = 0; i < batch.count; i++) {
      if (batch.cols.fsm[i] !== config.fsm) continue;
      const visible = config.visibleIn[batch.cols.state[i]] ?? [];
      for (const [name, layer] of layers) layer.hidden = !visible.includes(name);
    }
  };

  return {
    root,
    layer(name) {
      const layer = layers.get(name);
      if (!layer) throw new Error(`Unknown GUI layer "${name}"`);
      return layer;
    },
    handlers: () => [on(StateEntered, 'engine.gui.onStateEntered', onStateEntered)],
  };
}
