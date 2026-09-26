import { allocateColumns, type Columns, type Schema } from '../tables/columns';

/** A message contract: a name and the columns every row of that message carries. */
export interface MessageType<S extends Schema> {
  readonly name: string;
  readonly schema: S;
}

/** A batch of message rows delivered to a handler (read-only by convention). */
export interface MessageBatch<S extends Schema> {
  count: number;
  readonly cols: Columns<S>;
}

export function defineMessage<S extends Schema>(name: string, schema: S): MessageType<S> {
  return { name, schema };
}

export function createMessageQueue<S extends Schema>(type: MessageType<S>, capacity: number): MessageBatch<S> {
  return { count: 0, cols: allocateColumns(type.schema, capacity) };
}
