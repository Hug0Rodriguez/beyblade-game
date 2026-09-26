import { describe, expect, it } from 'vitest';
import { allMatches, findConditionErrors, firstMatch, passes } from './evaluateConditionTable';

const row: Record<string, number | string> = { spin: 200, type: 'attack', power: 0.95 };
const read = (column: string) => row[column];

describe('condition tables', () => {
  it('evaluates every operator and $refs', () => {
    expect(passes([['spin', '<', '$limit']], read, { limit: 250 })).toBe(true);
    expect(passes([['power', 'between', [0.9, 1]]], read, {})).toBe(true);
    expect(passes([['type', '==', 'attack'], ['spin', '>=', 300]], read, {})).toBe(false);
    expect(() => passes([['spin', '<', '$missing']], read, {})).toThrow(/\$missing/);
  });

  it('firstMatch picks the lowest priority, allMatches keeps table order', () => {
    const rows = [
      { name: 'late', priority: 2, when: [] },
      { name: 'early', priority: 0, when: [['spin', '>', 100]] as const },
      { name: 'never', priority: -1, when: [['spin', '>', 1000]] as const },
    ];
    expect(firstMatch(rows, read, {})?.name).toBe('early');
    expect(allMatches(rows, read, {}).map((r) => r.name)).toEqual(['late', 'early']);
  });

  it('reports unknown columns', () => {
    expect(findConditionErrors('x', [{ when: [['nope', '<', 1]] }], ['spin'])).toEqual(['x[0]: unknown column "nope"']);
  });
});
