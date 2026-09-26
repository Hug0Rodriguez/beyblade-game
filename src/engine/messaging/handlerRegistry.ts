import type { Schema } from '../tables/columns';
import type { MessageBatch, MessageType } from './defineMessage';

export type AnyBatch = MessageBatch<Schema>;

/** A named reaction to one message type ('*' = any type, e.g. an FSM fed by several messages). */
export interface HandlerDef {
  readonly id: string;
  readonly type: string;
  readonly fn: (batch: AnyBatch, typeName: string) => void;
}

export function on<S extends Schema>(
  type: MessageType<S>,
  id: string,
  fn: (batch: MessageBatch<S>) => void,
): HandlerDef {
  return { id, type: type.name, fn: fn as unknown as HandlerDef['fn'] };
}

export function onAny(id: string, fn: (batch: AnyBatch, typeName: string) => void): HandlerDef {
  return { id, type: '*', fn };
}

export interface HandlerRegistry {
  add(defs: readonly HandlerDef[]): void;
  get(id: string): HandlerDef | undefined;
  ids(): string[];
}

export function createHandlerRegistry(): HandlerRegistry {
  const byId = new Map<string, HandlerDef>();
  return {
    add(defs) {
      for (const def of defs) {
        if (byId.has(def.id)) throw new Error(`Duplicate handler id "${def.id}"`);
        byId.set(def.id, def);
      }
    },
    get: (id) => byId.get(id),
    ids: () => [...byId.keys()],
  };
}
