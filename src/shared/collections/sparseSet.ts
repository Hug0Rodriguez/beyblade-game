/**
 * Maps small integer ids to dense indices. Removal swaps the last dense entry
 * into the hole, so iteration over `dense[0..count)` stays contiguous.
 */
export interface SparseSet {
  readonly dense: Int32Array;
  readonly sparse: Int32Array;
  count: number;
}

export function createSparseSet(capacity: number, idSpace: number): SparseSet {
  const sparse = new Int32Array(idSpace).fill(-1);
  return { dense: new Int32Array(capacity), sparse, count: 0 };
}

export function sparseIndexOf(set: SparseSet, id: number): number {
  return id >= 0 && id < set.sparse.length ? set.sparse[id] : -1;
}

/** Adds `id` and returns its dense index (existing index when already present, -1 when full). */
export function sparseAdd(set: SparseSet, id: number): number {
  const existing = sparseIndexOf(set, id);
  if (existing !== -1) return existing;
  if (set.count >= set.dense.length || id < 0 || id >= set.sparse.length) return -1;
  const index = set.count++;
  set.dense[index] = id;
  set.sparse[id] = index;
  return index;
}

/** Removes `id`. Returns the dense index that was vacated and the id moved into it (or -1). */
export function sparseRemove(set: SparseSet, id: number): { vacated: number; movedFrom: number } {
  const index = sparseIndexOf(set, id);
  if (index === -1) return { vacated: -1, movedFrom: -1 };
  const last = --set.count;
  const lastId = set.dense[last];
  set.dense[index] = lastId;
  set.sparse[lastId] = index;
  set.sparse[id] = -1;
  return { vacated: index, movedFrom: index === last ? -1 : last };
}

export function sparseClear(set: SparseSet): void {
  for (let i = 0; i < set.count; i++) set.sparse[set.dense[i]] = -1;
  set.count = 0;
}
