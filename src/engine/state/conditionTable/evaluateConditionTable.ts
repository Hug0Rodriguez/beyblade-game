import { operators, type Operand, type OperatorName, type Scalar } from './operators';
import { resolveOperand, type ConditionRefs } from './resolveRefs';

/** One clause: [column, operator, value]. A value of "$name" is looked up in the refs. */
export type Condition = readonly [column: string, op: OperatorName, value: Operand];

/** A row of a condition table: all clauses must pass (empty = always). */
export interface ConditionRow {
  readonly when: readonly Condition[];
  readonly priority?: number;
}

/** Reads one column of the row being tested. */
export type ReadColumn = (column: string) => Scalar;

export function passes(when: readonly Condition[], read: ReadColumn, refs: ConditionRefs): boolean {
  for (const [column, op, value] of when) {
    const compare = operators[op];
    if (!compare) throw new Error(`Unknown condition operator "${op}"`);
    if (!compare(read(column), resolveOperand(value, refs))) return false;
  }
  return true;
}

/** The passing row with the lowest priority (ties → earliest). */
export function firstMatch<R extends ConditionRow>(
  rows: readonly R[],
  read: ReadColumn,
  refs: ConditionRefs,
): R | undefined {
  let best: R | undefined;
  for (const row of rows) {
    if (best && (row.priority ?? 0) >= (best.priority ?? 0)) continue;
    if (passes(row.when, read, refs)) best = row;
  }
  return best;
}

/** Every passing row, in table order. */
export function allMatches<R extends ConditionRow>(
  rows: readonly R[],
  read: ReadColumn,
  refs: ConditionRefs,
  out: R[] = [],
): R[] {
  out.length = 0;
  for (const row of rows) if (passes(row.when, read, refs)) out.push(row);
  return out;
}

/** Lists clauses whose column is not in `columns` or whose operator is unknown. */
export function findConditionErrors(
  label: string,
  rows: readonly ConditionRow[],
  columns: readonly string[],
): string[] {
  const errors: string[] = [];
  rows.forEach((row, index) => {
    for (const [column, op] of row.when) {
      if (!columns.includes(column)) errors.push(`${label}[${index}]: unknown column "${column}"`);
      if (!(op in operators)) errors.push(`${label}[${index}]: unknown operator "${op}"`);
    }
  });
  return errors;
}
