/** Column storage kinds shared by tables and message queues. */
export type ColumnKind = 'f64' | 'f32' | 'i32' | 'u8' | 'u16' | 'u32' | 'str';

export type ColumnArray<K extends ColumnKind> = K extends 'f64'
  ? Float64Array
  : K extends 'f32'
    ? Float32Array
    : K extends 'i32'
      ? Int32Array
      : K extends 'u8'
        ? Uint8Array
        : K extends 'u16'
          ? Uint16Array
          : K extends 'u32'
            ? Uint32Array
            : string[];

export type Schema = Record<string, ColumnKind>;

export type Columns<S extends Schema> = { [K in keyof S]: ColumnArray<S[K]> };

export type CellValue<K extends ColumnKind> = K extends 'str' ? string : number;

export type RowValues<S extends Schema> = { [K in keyof S]: CellValue<S[K]> };

const constructors = {
  f64: Float64Array,
  f32: Float32Array,
  i32: Int32Array,
  u8: Uint8Array,
  u16: Uint16Array,
  u32: Uint32Array,
} as const;

export function allocateColumns<S extends Schema>(schema: S, capacity: number): Columns<S> {
  const columns: Record<string, unknown> = {};
  for (const name of Object.keys(schema)) {
    const kind = schema[name];
    columns[name] = kind === 'str' ? new Array<string>(capacity).fill('') : new constructors[kind](capacity);
  }
  return columns as Columns<S>;
}

export function writeRow<S extends Schema>(
  columns: Columns<S>,
  row: number,
  values: Partial<RowValues<S>>,
): void {
  for (const name in values) {
    (columns[name] as { [index: number]: number | string })[row] = values[name] as number | string;
  }
}

export function copyRow<S extends Schema>(columns: Columns<S>, schema: S, from: number, to: number): void {
  for (const name of Object.keys(schema) as (keyof S)[]) {
    const column = columns[name] as { [index: number]: number | string };
    column[to] = column[from];
  }
}

export function resetRow<S extends Schema>(columns: Columns<S>, schema: S, row: number): void {
  for (const name of Object.keys(schema) as (keyof S)[]) {
    (columns[name] as { [index: number]: number | string })[row] = schema[name] === 'str' ? '' : 0;
  }
}
