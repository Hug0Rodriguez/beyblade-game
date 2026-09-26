import type { Schema } from '../tables/columns';
import type { Table } from '../tables/defineTable';
import { createDevOverlay, onDevKey } from './devOverlay';

export interface TableInspector {
  register(owner: string, table: Table<Schema>): void;
}

function formatCell(value: number | string): string {
  return typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : String(value);
}

/** Shows every registered table's live rows. */
export function createTableInspector(toggleKey: string): TableInspector {
  const overlay = createDevOverlay('right');
  const tables: { owner: string; table: Table<Schema> }[] = [];
  onDevKey(toggleKey, () => overlay.toggle());

  setInterval(() => {
    if (!overlay.isOpen()) return;
    const blocks = tables.map(({ owner, table }) => {
      const columns = Object.keys(table.schema);
      const lines = [`${owner}.${table.name}  (${table.count}/${table.capacity})`];
      for (let row = 0; row < table.count; row++) {
        const cells = columns.map(
          (name) => `${name}=${formatCell((table.cols[name] as { [i: number]: number | string })[row])}`,
        );
        lines.push(`  #${table.ids[row]} ${cells.join(' ')}`);
      }
      return lines.join('\n');
    });
    overlay.element.textContent = blocks.join('\n');
  }, 250);

  return {
    register: (owner, table) => tables.push({ owner, table }),
  };
}
