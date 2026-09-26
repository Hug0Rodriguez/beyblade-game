import { describe, expect, it } from 'vitest';
import { createMessageBus } from '../messaging/messageBus';
import { engineMessages, TimeScaleRequested } from '../messaging/engineMessages';
import { createHandlerRegistry } from '../messaging/handlerRegistry';
import { resolveRoutes } from '../messaging/routeTable';
import { createTimeScale } from './timeScale';

function setup() {
  const bus = createMessageBus({ maxDrainPasses: 4, defaultQueueCapacity: 8 });
  bus.register(engineMessages);
  const time = createTimeScale();
  const registry = createHandlerRegistry();
  registry.add(time.handlers());
  bus.setRoutes(resolveRoutes({ TimeScaleRequested: ['engine.time.onTimeScaleRequested'] }, registry, bus.types(), true));
  return { bus, time };
}

describe('time scale', () => {
  it('runs at 1 with no requests', () => {
    expect(setup().time.advance(0.016)).toBe(1);
  });

  it('uses the smallest running scale and expires requests in real time', () => {
    const { bus, time } = setup();
    bus.publish(TimeScaleRequested, { scale: 0.25, seconds: 1 });
    bus.publish(TimeScaleRequested, { scale: 0, seconds: 0.05 });
    bus.drain();
    expect(time.advance(0.03)).toBe(0);
    expect(time.advance(0.03)).toBe(0);
    expect(time.advance(0.03)).toBe(0.25);
    expect(time.advance(2)).toBe(0.25);
    expect(time.advance(0.01)).toBe(1);
  });
});
