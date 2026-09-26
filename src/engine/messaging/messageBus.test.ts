import { describe, expect, it } from 'vitest';
import { defineMessage } from './defineMessage';
import { createHandlerRegistry, on } from './handlerRegistry';
import { createMessageBus } from './messageBus';
import { resolveRoutes } from './routeTable';

const Ping = defineMessage('Ping', { n: 'u16' });
const Pong = defineMessage('Pong', { n: 'u16' });

function setup(routes: Record<string, string[]>, maxDrainPasses = 8) {
  const bus = createMessageBus({ maxDrainPasses, defaultQueueCapacity: 8 });
  bus.register([Ping, Pong]);
  const log: string[] = [];
  const registry = createHandlerRegistry();
  registry.add([
    on(Ping, 'a.onPing', (batch) => {
      log.push(`a:${batch.count}`);
      for (let i = 0; i < batch.count; i++) bus.publish(Pong, { n: batch.cols.n[i] });
    }),
    on(Ping, 'b.onPing', (batch) => log.push(`b:${batch.count}`)),
    on(Pong, 'c.onPong', (batch) => {
      log.push(`c:${batch.count}`);
      for (let i = 0; i < batch.count; i++) if (batch.cols.n[i] > 0) bus.publish(Ping, { n: batch.cols.n[i] - 1 });
    }),
  ]);
  bus.setRoutes(resolveRoutes(routes, registry, bus.types()));
  return { bus, log };
}

describe('message bus', () => {
  it('delivers batches in route order, and follow-ups in later passes', () => {
    const { bus, log } = setup({ Ping: ['b.onPing', 'a.onPing'], Pong: ['c.onPong'] });
    bus.publish(Ping, { n: 0 });
    bus.publish(Ping, { n: 0 });
    expect(log).toEqual([]);
    bus.drain();
    expect(log).toEqual(['b:2', 'a:2', 'c:2']);
  });

  it('stops a message storm after maxDrainPasses', () => {
    const { bus } = setup({ Ping: ['a.onPing', 'b.onPing'], Pong: ['c.onPong'] }, 4);
    bus.publish(Ping, { n: 50 });
    expect(() => bus.drain()).toThrow(/storm/);
  });

  it('rejects routes to unknown handlers, wrong types and unrouted handlers', () => {
    const bus = createMessageBus({ maxDrainPasses: 4, defaultQueueCapacity: 4 });
    bus.register([Ping, Pong]);
    const registry = createHandlerRegistry();
    registry.add([on(Ping, 'a.onPing', () => {}), on(Pong, 'c.onPong', () => {})]);
    expect(() => resolveRoutes({ Ping: ['nope'], Pong: ['a.onPing'] }, registry, bus.types())).toThrow(
      /unknown handler "nope"[\s\S]*handles "Ping"[\s\S]*never routed/,
    );
  });
});
