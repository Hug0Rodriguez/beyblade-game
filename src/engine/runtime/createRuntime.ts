import { Application } from 'pixi.js';

export interface RuntimeOptions {
  readonly parent: HTMLElement;
  readonly background: string;
  readonly maxResolution: number;
}

export interface Runtime {
  readonly app: Application;
}

/** DPR-aware Pixi application filling its parent (the page's safe area). */
export async function createRuntime(options: RuntimeOptions): Promise<Runtime> {
  const app = new Application();
  await app.init({
    resizeTo: options.parent,
    background: options.background,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, options.maxResolution),
  });
  app.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  options.parent.appendChild(app.canvas);
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  // Window "resize" events can be skipped (rotation, browser chrome, device emulation);
  // watching the parent's box keeps the renderer its size regardless.
  new ResizeObserver(() => app.resize()).observe(options.parent);
  return { app };
}
