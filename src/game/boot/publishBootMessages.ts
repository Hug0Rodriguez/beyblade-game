import type { MessageBus } from '@engine/messaging/messageBus';
import type { RowValues, Schema } from '@engine/tables/columns';
import type { GameData } from '../gameData/gameData';

/** Publishes data/game/boot/bootMessages.json — the first messages the game ever sees. */
export function publishBootMessages(bus: MessageBus, data: GameData): void {
  for (const message of data.boot.bootMessages) {
    const type = bus.types().get(message.type);
    if (!type) throw new Error(`bootMessages.json: unknown message type "${message.type}"`);
    bus.publish(type, message.values as RowValues<Schema>);
  }
}
