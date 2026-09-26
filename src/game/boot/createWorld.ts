import type { AnyDomainModule, DomainContext } from '../shared/domainContext';

/** Private state per domain, by domain name. Only boot ever holds all of them. */
export type World = ReadonlyMap<string, unknown>;

/** Every domain allocates and seeds its own tables. */
export function createWorld(modules: readonly AnyDomainModule[], ctx: DomainContext): World {
  const world = new Map<string, unknown>();
  for (const module of modules) world.set(module.name, module.createState(ctx));
  return world;
}
