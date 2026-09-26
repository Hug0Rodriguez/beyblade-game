import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../../gameData/loadGameData';
import { createHitContext, pickDirection, resolveHit, type HitContext } from './resolveHit';

const data = loadGameData();
const resolve = (overrides: Partial<HitContext>) =>
  resolveHit(data.brawl.hitOutcomes, { ...createHitContext(), ...overrides }, data.moves.moveTuning.timings)?.hit;

const dash = { attackKind: 'strike', attackerActive: 1 } as const;
const hook = { attackKind: 'grab', attackerActive: 1 } as const;
const dive = { attackKind: 'slam', attackerActive: 1 } as const;

describe('hit outcomes: the triangle DASH › HOOK › WHIRL › DASH', () => {
  it('WHIRL beats DASH: a Dash (or a Dive) into the ring is Deflected', () => {
    expect(resolve({ ...dash, defenderAttackKind: 'guard' })).toBe('deflect');
    expect(resolve({ ...dive, attackerAbove: 1, defenderAttackKind: 'guard' })).toBe('deflect');
  });

  it('HOOK beats WHIRL: a grab slings a Bracing Rig on the ground, spikes it in the air', () => {
    expect(resolve({ ...hook, defenderAttackKind: 'guard' })).toBe('sling');
    expect(resolve({ ...hook, defenderAttackKind: 'guard', defenderAirborne: 1 })).toBe('spike');
  });

  it('DASH beats HOOK: during its reach or its grab', () => {
    expect(resolve({ ...dash, defenderMove: 'hookReach' })).toBe('interrupt');
    expect(resolve({ ...dash, defenderAttackKind: 'grab' })).toBe('interrupt');
    // …and from the Hook's side, a Rig mid-Dash can't be grabbed.
    expect(resolve({ ...hook, defenderAttackKind: 'strike' })).not.toBe('sling');
  });

  it('mirrors: Dash vs Dash clashes, Hook vs Hook slips', () => {
    expect(resolve({ ...dash, defenderAttackKind: 'strike' })).toBe('clash');
    expect(resolve({ ...hook, defenderAttackKind: 'grab' })).toBe('grabSlip');
  });

  it('against a Rig that is only steering: Dash strikes, Hook slings, Whirl does nothing', () => {
    expect(resolve({ ...dash, defenderMove: 'ground' })).toBe('strike');
    expect(resolve({ ...hook, defenderMove: 'ground' })).toBe('sling');
    expect(resolve({ attackKind: 'guard', attackerActive: 1 })).toBe('bump');
  });
});

describe('hit outcomes: DIVE punishes, the air game', () => {
  it('a Dive on a stunned, launched or recovering Rig is a Punish; on a free Rig only a Slam', () => {
    expect(resolve({ ...dive, attackerAbove: 1, defenderVulnerable: 1 })).toBe('punish');
    expect(resolve({ ...dive, attackerAbove: 1 })).toBe('slam');
  });

  it('a grounded Dash knocks a hopping Rig Out of the Air; an Air Dash juggles', () => {
    expect(resolve({ ...dash, defenderAirborne: 1 })).toBe('outOfTheAir');
    expect(resolve({ ...dash, attackerAirborne: 1, defenderAirborne: 1 })).toBe('airStrike');
  });

  it('i-frames beat everything; two Rigs just touching bump', () => {
    expect(resolve({ ...dive, attackerAbove: 1, defenderIFrames: 1 })).toBe('ghost');
    expect(resolve({})).toBe('bump');
  });
});

describe('which side of a contact lands', () => {
  const rule = (hit: string, priority: number) => ({ hit, priority, when: [] });
  it('a ghost (target has i-frames) never blocks the other direction', () => {
    // The Shatter user has i-frames, so the rival's side reads "ghost"; the Shatter still lands.
    expect(pickDirection(rule('shatter', 0), rule('ghost', 0), data.brawl.hits, 100, 900)).toBe('a');
    expect(pickDirection(rule('ghost', 0), rule('ghost', 0), data.brawl.hits, 1, 1)).toBeUndefined();
  });

  it('otherwise the lower priority wins, and ties go to the faster Rig', () => {
    expect(pickDirection(rule('strike', 6), rule('deflect', 1), data.brawl.hits, 900, 0)).toBe('b');
    expect(pickDirection(rule('strike', 6), rule('strike', 6), data.brawl.hits, 300, 500)).toBe('b');
  });
});
