import { Text, type TextStyleFontWeight } from 'pixi.js';
import type { HudData } from '../gameData/schema/screenData';

/** Centred screen text in the HUD font. */
export function screenText(hud: HudData, text: string, fontSize: number, fill: string): Text {
  const label = new Text({
    text,
    style: {
      fontFamily: hud.font.fontFamily,
      fontWeight: hud.font.fontWeight as TextStyleFontWeight,
      fontSize,
      fill,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 600,
    },
  });
  label.anchor.set(0.5);
  return label;
}
