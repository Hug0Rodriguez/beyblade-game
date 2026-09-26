import { createSparseSet, type SparseSet } from '@shared/collections/sparseSet';
import { allocateColumns, type Columns, type Schema } from './columns';

/**
 * A struct-of-arrays table keyed by small integer ids.
 * Rows `0..count` are live; `ids[row]` is the key, `cols.x[row]` the data.
 */
export interface Table<S extends Schema> {
  readonly name: string;
  readonly schema: S;
  readonly capacity: number;
  readonly keys: SparseSet;
  readonly cols: Columns<S>;
  readonly count: number;
  readonly ids: Int32Array;
}

export function defineTable<S extends Schema>(
  name: string,
  schema: S,
  capacity: number,
  idSpace: number = capacity,
): Table<S> {
  const keys = createSparseSet(capacity, idSpace);
  return {
    name,
    schema,
    capacity,
    keys,
    cols: allocateColumns(schema, capacity),
    get count() {
      return keys.count;
    },
    get ids() {
      return keys.dense;
    },
  };
}
