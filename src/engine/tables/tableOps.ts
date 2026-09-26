import { invariant } from '@shared/assert/invariant';
import { sparseAdd, sparseClear, sparseIndexOf, sparseRemove } from '@shared/collections/sparseSet';
import { copyRow, resetRow, writeRow, type RowValues, type Schema } from './columns';
import type { Table } from './defineTable';

export function rowOf<S extends Schema>(table: Table<S>, id: number): number {
  return sparseIndexOf(table.keys, id);
}

export function has<S extends Schema>(table: Table<S>, id: number): boolean {
  return sparseIndexOf(table.keys, id) !== -1;
}

/** Inserts (or overwrites) the row for `id`. New rows start zeroed. Returns the row index. */
export function insert<S extends Schema>(
  table: Table<S>,
  id: number,
  values: Partial<RowValues<S>> = {},
): number {
  const existing = rowOf(table, id);
  const row = existing !== -1 ? existing : sparseAdd(table.keys, id);
  invariant(row !== -1, `Table "${table.name}" is full (capacity ${table.capacity}) or id ${id} is out of range`);
  if (existing === -1) resetRow(table.cols, table.schema, row);
  writeRow(table.cols, row, values);
  return row;
}

/** Swap-removes the row for `id`. Returns false when it was not present. */
export function remove<S extends Schema>(table: Table<S>, id: number): boolean {
  const { vacated, movedFrom } = sparseRemove(table.keys, id);
  if (vacated === -1) return false;
  if (movedFrom !== -1) copyRow(table.cols, table.schema, movedFrom, vacated);
  return true;
}

export function clear<S extends Schema>(table: Table<S>): void {
  sparseClear(table.keys);
}

/**
 * Moves `id` from one table to another, carrying over every column the two share.
 * This is how existence-based state changes: the row's table *is* its state.
 */
export function migrate<A extends Schema, B extends Schema>(
  from: Table<A>,
  to: Table<B>,
  id: number,
  extra: Partial<RowValues<B>> = {},
): boolean {
  const source = rowOf(from, id);
  if (source === -1) return false;
  const target = insert(to, id);
  for (const name of Object.keys(to.schema)) {
    if (name in from.schema) {
      (to.cols[name] as { [i: number]: number | string })[target] = (
        from.cols[name] as { [i: number]: number | string }
      )[source];
    }
  }
  writeRow(to.cols, target, extra);
  remove(from, id);
  return true;
}
