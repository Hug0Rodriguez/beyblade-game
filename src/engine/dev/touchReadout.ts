import type { Application } from 'pixi.js';

/**
 * Phone diagnostics (`?debug=1`, works in production builds): frame rate, renderer, size,
 * the last pointer event seen and how many touches the browser cancelled.
 */
export function createTouchReadout(parent: HTMLElement, app: Application): void {
  const box = document.createElement('pre');
  box.style.cssText =
    'position:absolute;left:8px;bottom:8px;margin:0;padding:6px 8px;z-index:99;pointer-events:none;' +
    'background:rgba(0,0,0,.6);color:#b6ff5c;font:11px/1.4 ui-monospace,monospace;white-space:pre;border-radius:6px';
  parent.appendChild(box);

  let frames = 0;
  let fps = 0;
  let last = performance.now();
  let lastEvent = '-';
  let cancels = 0;
  let downs = 0;
  const note = (event: PointerEvent) => {
    lastEvent = `${event.type} ${event.pointerType} #${event.pointerId} @${Math.round(event.clientX)},${Math.round(event.clientY)}`;
    if (event.type === 'pointercancel') cancels++;
    if (event.type === 'pointerdown') downs++;
  };
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) {
    window.addEventListener(type, note, { capture: true, passive: true });
  }
  app.ticker.add(() => {
    frames++;
    const now = performance.now();
    if (now - last >= 500) {
      fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
    }
    box.textContent =
      `fps ${fps}  ${app.renderer.name}  ${app.screen.width}x${app.screen.height}@${app.renderer.resolution}\n` +
      `${lastEvent}\ndowns ${downs}  cancels ${cancels}  fullscreen ${document.fullscreenElement ? 'yes' : 'no'}`;
  });
}
