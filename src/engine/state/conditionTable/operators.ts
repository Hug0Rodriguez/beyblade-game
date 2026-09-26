export type Scalar = number | string;
export type Operand = Scalar | readonly [Scalar, Scalar];

/** The only place comparison logic lives. Conditions in data name one of these. */
export const operators = {
  '<': (a: Scalar, b: Operand) => a < (b as Scalar),
  '<=': (a: Scalar, b: Operand) => a <= (b as Scalar),
  '>': (a: Scalar, b: Operand) => a > (b as Scalar),
  '>=': (a: Scalar, b: Operand) => a >= (b as Scalar),
  '==': (a: Scalar, b: Operand) => a === b,
  '!=': (a: Scalar, b: Operand) => a !== b,
  between: (a: Scalar, b: Operand) => {
    const [min, max] = b as readonly [Scalar, Scalar];
    return a >= min && a <= max;
  },
} as const;

export type OperatorName = keyof typeof operators;

export function isOperatorName(name: string): name is OperatorName {
  return name in operators;
}
