import { Container, Text } from 'pixi.js';
import type { UiFont } from './uiStyle';

export interface BannerTiming {
  readonly popSeconds: number;
  readonly popScale: number;
}

export interface Banner {
  readonly view: Container;
  show(text: string, color: string, seconds: number): void;
  hide(): void;
  update(dt: number, timing: BannerTiming): void;
}

/** Large centered text that pops in and hides itself after `seconds` (0 = stay). */
export function createBanner(font: UiFont, fontSize: number, strokeColor: string): Banner {
  const view = new Container();
  const label = new Text({
    text: '',
    style: {
      fontFamily: font.fontFamily,
      fontWeight: font.fontWeight as '900',
      fontSize,
      fill: '#ffffff',
      align: 'center',
      stroke: { color: strokeColor, width: Math.max(4, fontSize * 0.12), join: 'round' },
    },
  });
  label.anchor.set(0.5);
  view.addChild(label);
  view.visible = false;
  let age = 0;
  let lifetime = 0;

  return {
    view,
    show(text, color, seconds) {
      label.text = text;
      label.style.fill = color;
      age = 0;
      lifetime = seconds;
      view.visible = true;
    },
    hide() {
      view.visible = false;
    },
    update(dt, timing) {
      if (!view.visible) return;
      age += dt;
      const t = Math.min(1, age / timing.popSeconds);
      const eased = 1 + (timing.popScale - 1) * (1 - t) * (1 - t);
      label.scale.set(eased);
      if (lifetime > 0 && age >= lifetime) view.visible = false;
    },
  };
}
