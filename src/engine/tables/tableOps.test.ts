import { describe, expect, it } from 'vitest';
import { defineTable } from './defineTable';
import { has, insert, migrate, remove, rowOf } from './tableOps';

describe('tables', () => {
  it('inserts zeroed rows and swap-removes while keeping ids consistent', () => {
    const table = defineTable('t', { a: 'f64', label: 'str' }, 4);
    insert(table, 2, { a: 1, label: 'two' });
    insert(table, 0, { a: 5 });
    insert(table, 3, { a: 7, label: 'three' });
    expect(table.cols.label[rowOf(table, 0)]).toBe('');
    remove(table, 2);
    expect(has(table, 2)).toBe(false);
    expect(table.count).toBe(2);
    expect(table.cols.a[rowOf(table, 3)]).toBe(7);
    expect(table.cols.label[rowOf(table, 3)]).toBe('three');
  });

  it('migrate moves shared columns and keeps the id', () => {
    const from = defineTable('spinning', { spin: 'f64', x: 'f64' }, 2);
    const to = defineTable('toppled', { spin: 'f64', at: 'f64' }, 2);
    insert(from, 1, { spin: 42, x: 3 });
    expect(migrate(from, to, 1, { at: 9 })).toBe(true);
    expect(has(from, 1)).toBe(false);
    expect(to.cols.spin[rowOf(to, 1)]).toBe(42);
    expect(to.cols.at[rowOf(to, 1)]).toBe(9);
  });

  it('throws a readable error when full', () => {
    const table = defineTable('tiny', {}, 1);
    insert(table, 0);
    expect(() => insert(table, 1)).toThrow(/tiny/);
  });
});
