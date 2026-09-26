import type { Operand, Scalar } from './operators';

/** Values a condition can refer to with "$name" (tuning config, CPU profile, …). */
export type ConditionRefs = Readonly<Record<string, unknown>>;

function resolveScalar(value: Scalar, refs: ConditionRefs): Scalar {
  if (typeof value !== 'string' || !value.startsWith('$')) return value;
  const name = value.slice(1);
  const resolved = refs[name];
  if (typeof resolved !== 'number' && typeof resolved !== 'string') {
    throw new Error(`Condition reference "${value}" is missing or not a number/string`);
  }
  return resolved;
}

export function resolveOperand(value: Operand, refs: ConditionRefs): Operand {
  if (Array.isArray(value)) {
    const [min, max] = value as readonly [Scalar, Scalar];
    return [resolveScalar(min, refs), resolveScalar(max, refs)];
  }
  return resolveScalar(value as Scalar, refs);
}
