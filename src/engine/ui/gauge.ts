import { Container, Graphics } from 'pixi.js';

export interface GaugeStyle {
  readonly width: number;
  readonly height: number;
  readonly backColor: string;
  readonly fillColor: string;
  readonly cornerRadius: number;
}

export interface Gauge {
  readonly view: Container;
  set(ratio: number): void;
  setFillColor(color: string): void;
  resize(width: number): void;
}

/** Horizontal bar; `set` takes 0..1. `flip` fills right-to-left. */
export function createGauge(style: GaugeStyle, flip = false): Gauge {
  const view = new Container();
  const back = new Graphics();
  const fill = new Graphics();
  view.addChild(back, fill);
  let width = style.width;
  let ratio = 1;
  let color = style.fillColor;

  const draw = () => {
    back.clear().roundRect(0, 0, width, style.height, style.cornerRadius).fill({ color: style.backColor });
    const filled = Math.max(0, Math.min(1, ratio)) * width;
    fill.clear();
    if (filled > 0.5) {
      fill
        .roundRect(flip ? width - filled : 0, 0, filled, style.height, style.cornerRadius)
        .fill({ color });
    }
  };
  draw();

  return {
    view,
    set(next) {
      if (Math.abs(next - ratio) < 0.001) return;
      ratio = next;
      draw();
    },
    setFillColor(next) {
      if (next === color) return;
      color = next;
      draw();
    },
    resize(next) {
      width = next;
      draw();
    },
  };
}
