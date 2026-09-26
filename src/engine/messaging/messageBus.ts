import { invariant } from '@shared/assert/invariant';
import type { RowValues, Schema } from '../tables/columns';
import { writeRow } from '../tables/columns';
import { createMessageQueue, type MessageBatch, type MessageType } from './defineMessage';
import type { HandlerDef } from './handlerRegistry';
import type { ResolvedRoute } from './routeTable';

export interface MessageBusConfig {
  readonly maxDrainPasses: number;
  readonly defaultQueueCapacity: number;
}

export type DeliveryObserver = (typeName: string, count: number, pass: number) => void;

interface Channel {
  readonly type: MessageType<Schema>;
  readonly capacity: number;
  pending: MessageBatch<Schema>;
  delivering: MessageBatch<Schema>;
  handlers: readonly HandlerDef[];
  ready: boolean;
}

export interface MessageBus {
  register(types: readonly MessageType<Schema>[], capacityOf?: (name: string) => number | undefined): void;
  types(): ReadonlyMap<string, MessageType<Schema>>;
  setRoutes(routes: readonly ResolvedRoute[]): void;
  /** Appends a row to the message's queue. Never calls anyone synchronously. */
  publish<S extends Schema>(type: MessageType<S>, values: RowValues<S>): void;
  /** Delivers queued messages in batches, pass after pass, until quiet. */
  drain(): void;
  observe(observer: DeliveryObserver | undefined): void;
}

export function createMessageBus(config: MessageBusConfig): MessageBus {
  const channels = new Map<string, Channel>();
  const types = new Map<string, MessageType<Schema>>();
  let order: Channel[] = [];
  let observer: DeliveryObserver | undefined;

  return {
    register(newTypes, capacityOf) {
      for (const type of newTypes) {
        invariant(!channels.has(type.name), `Message type "${type.name}" registered twice`);
        const capacity = capacityOf?.(type.name) ?? config.defaultQueueCapacity;
        channels.set(type.name, {
          type,
          capacity,
          pending: createMessageQueue(type, capacity),
          delivering: createMessageQueue(type, capacity),
          handlers: [],
          ready: false,
        });
        types.set(type.name, type);
      }
      order = [...channels.values()];
    },

    types: () => types,

    setRoutes(routes) {
      for (const channel of channels.values()) channel.handlers = [];
      const routedOrder: Channel[] = [];
      for (const route of routes) {
        const channel = channels.get(route.type);
        if (!channel) continue;
        channel.handlers = route.handlers;
        routedOrder.push(channel);
      }
      for (const channel of channels.values()) if (!routedOrder.includes(channel)) routedOrder.push(channel);
      order = routedOrder;
    },

    publish(type, values) {
      const channel = channels.get(type.name);
      invariant(channel, `Publishing unregistered message "${type.name}"`);
      const queue = channel.pending;
      invariant(
        queue.count < channel.capacity,
        `Message queue "${type.name}" overflowed (capacity ${channel.capacity}); raise it in capacities.json`,
      );
      writeRow(queue.cols, queue.count++, values as RowValues<Schema>);
    },

    drain() {
      for (let pass = 0; pass < config.maxDrainPasses; pass++) {
        let any = false;
        for (const channel of order) {
          if (channel.pending.count === 0) continue;
          const swap = channel.delivering;
          channel.delivering = channel.pending;
          channel.pending = swap;
          channel.ready = true;
          any = true;
        }
        if (!any) return;
        for (const channel of order) {
          if (!channel.ready) continue;
          const batch = channel.delivering;
          observer?.(channel.type.name, batch.count, pass);
          for (const handler of channel.handlers) handler.fn(batch, channel.type.name);
          batch.count = 0;
          channel.ready = false;
        }
      }
      throw new Error(`Message storm: still publishing after ${config.maxDrainPasses} drain passes`);
    },

    observe(next) {
      observer = next;
    },
  };
}
