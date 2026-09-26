/** Collects data errors so every problem is reported at once. */
export interface DataValidator {
  error(message: string): void;
  errors(messages: readonly string[]): void;
  requireRange(path: string, value: unknown, min: number, max: number): void;
  requireRef(path: string, id: unknown, known: ReadonlySet<string> | readonly string[]): void;
  requireOneOf(path: string, value: unknown, allowed: readonly string[]): void;
  throwIfAny(title: string): void;
}

export function createDataValidator(): DataValidator {
  const messages: string[] = [];
  return {
    error: (message) => messages.push(message),
    errors: (list) => messages.push(...list),
    requireRange(path, value, min, max) {
      if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max) {
        messages.push(`${path}: expected number in [${min}, ${max}], got ${JSON.stringify(value)}`);
      }
    },
    requireRef(path, id, known) {
      const has = Array.isArray(known) ? known.includes(id as string) : (known as ReadonlySet<string>).has(id as string);
      if (!has) messages.push(`${path}: unknown id ${JSON.stringify(id)}`);
    },
    requireOneOf(path, value, allowed) {
      if (!allowed.includes(value as string)) {
        messages.push(`${path}: expected one of ${allowed.join(', ')}, got ${JSON.stringify(value)}`);
      }
    },
    throwIfAny(title) {
      if (messages.length > 0) throw new Error(`${title}\n  ${messages.join('\n  ')}`);
    },
  };
}
