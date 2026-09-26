/** Modules as produced by `import.meta.glob(..., { eager: true, import: 'default' })`. */
export type JsonModules = Record<string, unknown>;

export interface JsonTree {
  /** Reads `<root>/<relativePath>`; throws a readable error when the file is missing. */
  get<T>(relativePath: string): T;
  paths(): string[];
}

export function createJsonTree(modules: JsonModules, root: string): JsonTree {
  const prefix = root.endsWith('/') ? root : `${root}/`;
  return {
    get<T>(relativePath: string): T {
      const key = prefix + relativePath;
      if (!(key in modules)) throw new Error(`Missing data file ${key}`);
      return modules[key] as T;
    },
    paths: () => Object.keys(modules).map((key) => key.slice(prefix.length)),
  };
}
