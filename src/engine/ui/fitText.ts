import type { Text } from 'pixi.js';

/** Shrinks `text` uniformly so it is no wider than `maxWidth` (never enlarges). */
export function fitText(text: Text, maxWidth: number): void {
  text.scale.set(1);
  if (maxWidth <= 0) return;
  if (text.width > maxWidth && text.width > 0) text.scale.set(maxWidth / text.width);
}
