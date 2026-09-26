/**
 * Phones hide the browser bars only in fullscreen. Ask for it on the first touch tap, which is
 * a user gesture the browser accepts. No-op where the API is missing (iPhone Safari) or when
 * launched from the home screen (already standalone).
 */
export function attachFullscreenOnTouch(target: HTMLElement): void {
  const root = document.documentElement;
  if (typeof root.requestFullscreen !== 'function') return;
  if (window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) return;
  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || document.fullscreenElement) return;
    target.removeEventListener('pointerup', onPointerUp);
    root.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
  };
  target.addEventListener('pointerup', onPointerUp);
}
