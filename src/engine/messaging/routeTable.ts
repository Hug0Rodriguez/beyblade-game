import type { Schema } from '../tables/columns';
import type { MessageType } from './defineMessage';
import type { HandlerDef, HandlerRegistry } from './handlerRegistry';

/** message type name → ordered handler ids, as authored in data. */
export type RouteTableData = Record<string, string[]>;

export interface ResolvedRoute {
  readonly type: string;
  readonly handlers: readonly HandlerDef[];
}

/**
 * Validates the route table against the known message types and registered handlers.
 * Key order in the data is the delivery order within a drain pass.
 * `skipUnknownHandlers` lets a partial world (e.g. tests without views) reuse the full table.
 */
export function resolveRoutes(
  routes: RouteTableData,
  registry: HandlerRegistry,
  types: ReadonlyMap<string, MessageType<Schema>>,
  skipUnknownHandlers = false,
): ResolvedRoute[] {
  const errors: string[] = [];
  const resolved: ResolvedRoute[] = [];
  const routed = new Set<string>();

  for (const [typeName, handlerIds] of Object.entries(routes)) {
    if (typeName.startsWith('//')) continue;
    if (!types.has(typeName)) errors.push(`routes: unknown message type "${typeName}"`);
    const handlers: HandlerDef[] = [];
    for (const id of handlerIds) {
      const handler = registry.get(id);
      if (!handler) {
        if (skipUnknownHandlers) continue;
        errors.push(`routes.${typeName}: unknown handler "${id}"`);
      } else if (handler.type !== '*' && handler.type !== typeName) {
        errors.push(`routes.${typeName}: handler "${id}" handles "${handler.type}", not "${typeName}"`);
      } else {
        handlers.push(handler);
        routed.add(id);
      }
    }
    resolved.push({ type: typeName, handlers });
  }

  for (const id of registry.ids()) {
    if (!routed.has(id)) errors.push(`routes: handler "${id}" is registered but never routed`);
  }
  if (errors.length > 0) throw new Error(`Invalid route table:\n  ${errors.join('\n  ')}`);
  return resolved;
}
