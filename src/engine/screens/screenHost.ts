import { Container } from 'pixi.js';
import type { MessageBatch } from '../messaging/defineMessage';
import { StateEntered, ViewportResized } from '../messaging/engineMessages';
import { on, type HandlerDef } from '../messaging/handlerRegistry';

export interface ScreenLayerSpec {
  readonly name: string;
  /** "world" layers are centred and scaled to fit `worldSize`; "screen" layers use raw pixels; "gui" layers are HTML (guiHost). */
  readonly space: 'world' | 'screen' | 'gui';
}

export interface ScreenHostConfig {
  /** Which FSM's states select the visible layers. */
  readonly fsm: string;
  readonly layers: readonly ScreenLayerSpec[];
  /** state → layer names visible in that state. */
  readonly visibleIn: Readonly<Record<string, readonly string[]>>;
  /** World units that must fit the shortest screen side. */
  readonly worldSize: number;
}

export interface ScreenHost {
  layer(name: string): Container;
  /** Parent of all world layers; offset it to shake the camera. */
  readonly worldShake: Container;
  /** Between the fitted world root and the shake: scale / move it to zoom and follow. */
  readonly worldCamera: Container;
  worldScale(): number;
  handlers(): HandlerDef[];
}

export function createScreenHost(stage: Container, config: ScreenHostConfig): ScreenHost {
  const worldRoot = new Container();
  const worldCamera = new Container();
  const worldShake = new Container();
  const screenRoot = new Container();
  worldRoot.addChild(worldCamera);
  worldCamera.addChild(worldShake);
  stage.addChild(worldRoot, screenRoot);

  const layers = new Map<string, Container>();
  for (const spec of config.layers) {
    if (spec.space === 'gui') continue;
    const layer = new Container();
    layer.label = spec.name;
    layer.visible = false;
    (spec.space === 'world' ? worldShake : screenRoot).addChild(layer);
    layers.set(spec.name, layer);
  }
  let scale = 1;

  const onStateEntered = (batch: MessageBatch<typeof StateEntered.schema>) => {
    for (let i = 0; i < batch.count; i++) {
      if (batch.cols.fsm[i] !== config.fsm) continue;
      const visible = config.visibleIn[batch.cols.state[i]] ?? [];
      for (const [name, layer] of layers) layer.visible = visible.includes(name);
    }
  };
  const onViewportResized = (batch: MessageBatch<typeof ViewportResized.schema>) => {
    const last = batch.count - 1;
    const width = batch.cols.width[last];
    const height = batch.cols.height[last];
    scale = Math.min(width, height) / config.worldSize;
    worldRoot.position.set(width / 2, height / 2);
    worldRoot.scale.set(scale);
  };

  return {
    layer(name) {
      const layer = layers.get(name);
      if (!layer) throw new Error(`Unknown screen layer "${name}"`);
      return layer;
    },
    worldShake,
    worldCamera,
    worldScale: () => scale,
    handlers: () => [
      on(StateEntered, 'engine.screens.onStateEntered', onStateEntered),
      on(ViewportResized, 'engine.screens.onViewportResized', onViewportResized),
    ],
  };
}
