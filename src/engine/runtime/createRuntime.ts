import { Application } from 'pixi.js';

export interface RuntimeOptions {
  readonly parent: HTMLElement;
  readonly background: string;
  readonly maxResolution: number;
}

export interface Runtime {
  readonly app: Application;
}

/** Full-window, DPR-aware Pixi application. */
export async function createRuntime(options: RuntimeOptions): Promise<Runtime> {
  const app = new Application();
  await app.init({
    resizeTo: window,
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
  // watching the page box keeps the renderer the size of the window regardless.
  new ResizeObserver(() => app.resize()).observe(document.documentElement);
  return { app };
}
