import { Container, Rectangle, type FederatedPointerEvent } from 'pixi.js';
import type { MessageBus } from '../../messaging/messageBus';
import { DragChanged } from '../../messaging/engineMessages';

export interface DragGesture {
  readonly view: Container;
  setZone(x: number, y: number, width: number, height: number): void;
}

/** Press-drag-release anywhere in a zone. Publishes DragChanged (screen pixels) while active and on release. */
export function createDragGesture(bus: MessageBus, widget: string): DragGesture {
  const view = new Container();
  view.eventMode = 'static';
  let pointerId = -1;
  let startX = 0;
  let startY = 0;

  const publish = (event: FederatedPointerEvent, active: number) =>
    bus.publish(DragChanged, { widget, active, startX, startY, x: event.global.x, y: event.global.y });

  view.on('pointerdown', (event) => {
    if (pointerId !== -1) return;
    pointerId = event.pointerId;
    startX = event.global.x;
    startY = event.global.y;
    publish(event, 1);
  });
  view.on('globalpointermove', (event) => {
    if (event.pointerId === pointerId) publish(event, 1);
  });
  const release = (event: FederatedPointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = -1;
    publish(event, 0);
  };
  view.on('pointerup', release);
  view.on('pointerupoutside', release);

  return {
    view,
    setZone(x, y, width, height) {
      view.hitArea = new Rectangle(x, y, width, height);
    },
  };
}
