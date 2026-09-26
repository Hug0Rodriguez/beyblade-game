import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../../gameData/loadGameData';
import { resolveMove, type MoveContext } from './resolveMove';

const data = loadGameData();
const context = (overrides: Partial<MoveContext>): MoveContext => ({
  button: 'dash',
  state: 'ground',
  locked: 0,
  airborne: 0,
  spinRatio: 1,
  shatterReady: 0,
  rank: 0,
  ready: Object.fromEntries(Object.keys(data.moves.moveTuning.moves).map((name) => [name, 1])),
  ...overrides,
});
const resolve = (overrides: Partial<MoveContext>) => resolveMove(data.moves.moveTable, context(overrides), data.moves.moveTuning.timings);

describe('the context move table', () => {
  it('on the ground, Dash and Hook start with their tell; Whirl braces at once', () => {
    expect(resolve({})).toBe('dashRevUp');
    expect(resolve({ button: 'hook' })).toBe('hookReach');
    expect(resolve({ button: 'whirl' })).toBe('whirl');
  });

  it('nothing starts while committed (stunned, or recovering from a move)', () => {
    expect(resolve({ locked: 1, state: 'stunned' })).toBeUndefined();
    expect(resolve({ locked: 1, state: 'dashRecover', button: 'whirl' })).toBeUndefined();
  });

  it('Dash waits for its cooldown', () => {
    expect(resolve({ ready: { dashRevUp: 0 } })).toBeUndefined();
  });

  it('in the air the triangle has air versions, and Pop again Dives', () => {
    expect(resolve({ button: 'pop' })).toBe('pop');
    expect(resolve({ button: 'pop', airborne: 1, state: 'pop' })).toBe('dive');
    expect(resolve({ button: 'dash', airborne: 1, state: 'pop' })).toBe('airDash');
    expect(resolve({ button: 'whirl', airborne: 1, state: 'pop' })).toBe('airWhirl');
    expect(resolve({ button: 'hook', airborne: 1, state: 'pop' })).toBe('airHook');
  });

  it('launched: any button Breaks Out while there is Spin to pay for it', () => {
    expect(resolve({ button: 'whirl', state: 'launched', locked: 1, airborne: 1 })).toBe('breakOut');
    expect(resolve({ button: 'dash', state: 'launched', locked: 1, airborne: 1, spinRatio: 0.05 })).toBeUndefined();
  });
});

describe('Rev spends in the move table', () => {
  it('launched at Steady or higher: the Break Out is paid with a Rank (Rev Break)', () => {
    expect(resolve({ button: 'dash', state: 'launched', locked: 1, airborne: 1, rank: 1 })).toBe('revBreakOut');
    expect(resolve({ button: 'dash', state: 'launched', locked: 1, airborne: 1, rank: 0 })).toBe('breakOut');
  });
});
