import { createHandlerRegistry, type HandlerDef } from '@engine/messaging/handlerRegistry';
import type { MessageBus } from '@engine/messaging/messageBus';
import { resolveRoutes } from '@engine/messaging/routeTable';
import type { AnyDomainModule, DomainContext, ViewContext } from '../shared/domainContext';
import type { World } from './createWorld';

/**
 * Collects every handler (model, view, engine) and wires them to messages through
 * routes.json. Pass no `view` context to register model handlers only (tests).
 */
export function registerHandlers(
  bus: MessageBus,
  modules: readonly AnyDomainModule[],
  world: World,
  ctx: DomainContext,
  view?: ViewContext,
  engineHandlers: readonly HandlerDef[] = [],
): void {
  const registry = createHandlerRegistry();
  registry.add(engineHandlers);
  for (const module of modules) {
    registry.add(module.createHandlers(world.get(module.name), ctx));
    if (view && module.createViewHandlers) registry.add(module.createViewHandlers(view));
  }
  bus.setRoutes(resolveRoutes(ctx.data.messaging.routes, registry, bus.types(), view === undefined));
}
