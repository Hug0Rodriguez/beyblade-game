import { Container, Graphics, Text } from 'pixi.js';
import type { UiFont } from './uiStyle';

export interface MenuButtonStyle extends UiFont {
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly fillColor: string;
  readonly hoverColor: string;
  readonly textColor: string;
  readonly cornerRadius: number;
}

/** Rounded button centred on its position; calls `onPress` on tap. */
export function createMenuButton(label: string, style: MenuButtonStyle, onPress: () => void): Container {
  const view = new Container();
  const face = new Graphics();
  const draw = (color: string) =>
    face
      .clear()
      .roundRect(-style.width / 2, -style.height / 2, style.width, style.height, style.cornerRadius)
      .fill({ color });
  draw(style.fillColor);
  const text = new Text({
    text: label,
    style: {
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight as '900',
      fontSize: style.fontSize,
      fill: style.textColor,
    },
  });
  text.anchor.set(0.5);
  view.addChild(face, text);
  view.eventMode = 'static';
  view.cursor = 'pointer';
  view.on('pointerover', () => draw(style.hoverColor));
  view.on('pointerout', () => draw(style.fillColor));
  view.on('pointertap', onPress);
  return view;
}
