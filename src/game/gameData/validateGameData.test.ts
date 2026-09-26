import { describe, expect, it } from 'vitest';
import { cloneGameData, loadGameData } from './loadGameData';
import { validateGameData } from './validateGameData';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

function broken(edit: (data: Mutable<ReturnType<typeof loadGameData>>) => void) {
  const data = cloneGameData(loadGameData()) as Mutable<ReturnType<typeof loadGameData>>;
  edit(data);
  return () => validateGameData(data);
}

describe('game data', () => {
  it('the shipped data is valid', () => {
    expect(() => validateGameData(loadGameData())).not.toThrow();
  });

  it('rejects a Spinner bringing a missing Rig', () => {
    expect(broken((d) => void (d.spinner.spinners[0].rigId = 'ghost'))).toThrow(/spinners\[0\]\.rigId: unknown id "ghost"/);
  });

  it('rejects an unreachable FSM state', () => {
    expect(broken((d) => void d.flow.gameFlow.states.push('limbo'))).toThrow(/state "limbo" is unreachable/);
  });

  it('rejects a condition on an unknown column', () => {
    expect(broken((d) => void (d.round.finishConditions[0].when[0][0] = 'vibes'))).toThrow(/finishConditions\[0\]: unknown column "vibes"/);
  });

  it('rejects a move-table row for a move that is not a moveFlow state', () => {
    expect(broken((d) => void d.moves.moveTable.push({ move: 'teleport', priority: 1, when: [] }))).toThrow(/unknown id "teleport"/);
  });

  it('rejects a Tactic without a command', () => {
    expect(broken((d) => void d.spinner.cpuTactics.states.push('taunt'))).toThrow(/missing command for Tactic "taunt"/);
  });
});
