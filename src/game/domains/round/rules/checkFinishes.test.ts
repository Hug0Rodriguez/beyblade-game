import { describe, expect, it } from 'vitest';
import { defineTable } from '@engine/tables/defineTable';
import { insert } from '@engine/tables/tableOps';
import { loadGameData } from '../../../gameData/loadGameData';
import { findFinish } from './checkFinishes';

const data = loadGameData();
const table = () => defineTable('t', { spin: 'f64', spinRatio: 'f64', spilled: 'u8', shattered: 'u8' }, 4);

describe('Finish conditions', () => {
  it('no Finish while both Rigs spin inside the Dish', () => {
    const t = table();
    insert(t, 0, { spin: 50, spinRatio: 0.5 });
    insert(t, 1, { spin: 80, spinRatio: 0.8 });
    expect(findFinish(t, data.round.finishConditions, data.round.roundRules)).toBeUndefined();
  });

  it('a Spill beats a Topple on the other Rig', () => {
    const t = table();
    insert(t, 0, { spin: 0, spinRatio: 0 });
    insert(t, 1, { spin: 80, spinRatio: 0.8, spilled: 1 });
    expect(findFinish(t, data.round.finishConditions, data.round.roundRules)).toMatchObject({ rigId: 1, condition: { finish: 'spill' } });
  });

  it('Topple when Spin runs out', () => {
    const t = table();
    insert(t, 0, { spin: 0 });
    insert(t, 1, { spin: 40, spinRatio: 0.4 });
    expect(findFinish(t, data.round.finishConditions, data.round.roundRules)).toMatchObject({ rigId: 0, condition: { finish: 'topple' } });
  });
});
