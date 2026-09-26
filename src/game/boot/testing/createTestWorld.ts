import { engineMessages, StepTicked } from '@engine/messaging/engineMessages';
import { createHandlerRegistry, onAny } from '@engine/messaging/handlerRegistry';
import { createMessageBus, type MessageBus } from '@engine/messaging/messageBus';
import { resolveRoutes } from '@engine/messaging/routeTable';
import { createSeededRandom, hashString } from '@shared/random/seededRandom';
import type { GameData } from '../../gameData/gameData';
import { cloneGameData, loadGameData } from '../../gameData/loadGameData';
import { gameMessages } from '../../messages';
import type { AnyDomainModule, DomainContext } from '../../shared/domainContext';
import { createWorld, type World } from '../createWorld';
import { domainRegistry } from '../domainRegistry';

export type SentRow = Record<string, number | string>;

export interface TestWorld {
  readonly data: GameData;
  readonly bus: MessageBus;
  readonly world: World;
  /** Every message delivered so far, by type, as plain rows. */
  readonly sent: Map<string, SentRow[]>;
  publish: MessageBus['publish'];
  drain(): void;
  step(count?: number): void;
  rows(type: string): SentRow[];
  clearSent(): void;
}

/**
 * A headless game: all model handlers (no views, no Pixi), wired by the real routes.json,
 * plus a capture handler that records every delivered message.
 */
export function createTestWorld(
  options: { data?: GameData; modules?: readonly AnyDomainModule[]; seed?: number } = {},
): TestWorld {
  const data = options.data ?? cloneGameData(loadGameData());
  const modules = options.modules ?? domainRegistry;
  const seed = options.seed ?? data.boot.random.seed;
  const bus = createMessageBus({ maxDrainPasses: 32, defaultQueueCapacity: 64 });
  bus.register([...engineMessages, ...gameMessages], (name) => data.boot.capacities.messageQueues[name]);
  const ctx: DomainContext = {
    data,
    publish: bus.publish,
    random: (salt) => createSeededRandom(seed ^ hashString(salt)),
    inspect: () => {},
  };
  const world = createWorld(modules, ctx);

  const sent = new Map<string, SentRow[]>();
  const registry = createHandlerRegistry();
  registry.add([
    onAny('test.capture', (batch, typeName) => {
      const schema = bus.types().get(typeName)!.schema;
      const list = sent.get(typeName) ?? [];
      for (let i = 0; i < batch.count; i++) {
        const row: SentRow = {};
        for (const column of Object.keys(schema)) row[column] = (batch.cols[column] as { [n: number]: number | string })[i];
        list.push(row);
      }
      sent.set(typeName, list);
    }),
  ]);
  for (const module of modules) registry.add(module.createHandlers(world.get(module.name), ctx));
  // Same delivery order as the game (routes.json key order), plus capture on every type.
  const routes: Record<string, string[]> = {};
  for (const [typeName, handlers] of Object.entries(data.messaging.routes)) {
    if (bus.types().has(typeName)) routes[typeName] = [...handlers, 'test.capture'];
  }
  for (const typeName of bus.types().keys()) routes[typeName] ??= ['test.capture'];
  bus.setRoutes(resolveRoutes(routes, registry, bus.types(), true));

  let stepIndex = 0;
  const dt = 1 / 120;
  return {
    data,
    bus,
    world,
    sent,
    publish: bus.publish,
    drain: () => bus.drain(),
    step(count = 1) {
      for (let i = 0; i < count; i++) {
        bus.publish(StepTicked, { dt, stepIndex: stepIndex++ });
        bus.drain();
      }
    },
    rows: (type) => sent.get(type) ?? [],
    clearSent: () => sent.clear(),
  };
}
