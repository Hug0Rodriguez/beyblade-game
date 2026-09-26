import { describe, expect, it } from 'vitest';
import type { GearRow, HitSpec } from '../../../gameData/schema/brawlData';
import { applyHit, bounce } from './applyHit';
import { gearOf, nextGear } from './gears';

const gears: GearRow[] = [
  { gear: 0, minSpeedRatio: 0, damageMultiplier: 0.5, knockbackMultiplier: 0.5, color: '' },
  { gear: 1, minSpeedRatio: 0.6, damageMultiplier: 1, knockbackMultiplier: 1, color: '' },
  { gear: 2, minSpeedRatio: 1.5, damageMultiplier: 2, knockbackMultiplier: 1.5, color: '' },
  { gear: 3, minSpeedRatio: 2.2, damageMultiplier: 3, knockbackMultiplier: 2, color: '' },
];

const strike: HitSpec = {
  effect: 'hit',
  damage: 5,
  knockback: 200,
  ricochetKeep: 0.35,
  ricochetAim: 0.7,
  ricochetMinSpeed: 50,
};

/** Base speed 200: 100 = Gear 0, 200 = Gear 1, 300 = Gear 2, 600 = Gear 3. */
function hit(attackerVx: number, steerX: number, steerY: number, multiplier = 1, spec = strike) {
  const bodies = { attacker: { x: attackerVx, y: 0 }, defender: { x: 0, y: 0 }, defenderWeight: 1, attackerBaseSpeed: 200 };
  const out = applyHit(bodies, 1, 0, steerX, steerY, spec, multiplier, gears, { damage: 0, attackerSpeed: 0, launchVz: 0, gear: 0 });
  return { bodies, out };
}

describe('Gears', () => {
  it('speed reads as a Gear, in multiples of the base speed', () => {
    expect([0, 150, 300, 450].map((speed) => gearOf(gears, speed, 200))).toEqual([0, 1, 2, 3]);
  });

  it('the shown Gear rises at a threshold but only drops well below it (no flicker at the edge)', () => {
    // Gear 2 starts at 300 (1.5 × 200); with a 10% margin it only drops below 270.
    expect(nextGear(gears, 1, 300, 200, 0.1)).toBe(2);
    expect(nextGear(gears, 2, 290, 200, 0.1)).toBe(2);
    expect(nextGear(gears, 2, 265, 200, 0.1)).toBe(1);
    expect(nextGear(gears, 3, 0, 200, 0.1)).toBe(0);
  });
});

describe('hits spend the speed you built', () => {
  it('damage is the base × the Gear multiplier × the Rev multiplier', () => {
    expect(hit(200, 0, 0).out).toMatchObject({ gear: 1, damage: 5 });
    expect(hit(600, 0, 0).out).toMatchObject({ gear: 3, damage: 15 });
    expect(hit(600, 0, 0, 2).out.damage).toBeCloseTo(30);
  });

  it('a hit that ignores Gear deals its fixed damage', () => {
    expect(hit(600, 0, 0, 1, { ...strike, gearScaled: false }).out.damage).toBe(5);
  });

  it('knocks the defender along the contact normal, harder at a higher Gear', () => {
    const { bodies } = hit(600, 0, 0);
    expect(bodies.defender.x).toBeCloseTo(200 * 2);
    expect(bodies.defender.y).toBeCloseTo(0);
  });

  it('the attacker keeps only part of its speed: the hit spent it', () => {
    const { bodies } = hit(600, 0, 0);
    expect(bodies.attacker.x).toBeCloseTo(-600 * 0.35);
  });

  it('the stick aims the ricochet, but never back into the defender', () => {
    const up = hit(600, 0, -1).bodies.attacker;
    expect(up.y).toBeLessThan(-100);
    expect(Math.hypot(up.x, up.y)).toBeCloseTo(210);
    const into = hit(600, 1, 0).bodies.attacker;
    expect(into.x).toBeLessThanOrEqual(0);
  });

  it('a sling knocks the defender toward the attacker\'s stick', () => {
    const { bodies } = hit(200, 0, 1, 1, { ...strike, aimKnockback: true });
    expect(bodies.defender.y).toBeCloseTo(200);
    expect(bodies.defender.x).toBeCloseTo(0);
  });

  it('bounce conserves momentum', () => {
    const a = { x: 300, y: 0 };
    const b = { x: -100, y: 0 };
    bounce(a, b, 1, 2, 1, 0, 0.8);
    expect(a.x * 1 + b.x * 2).toBeCloseTo(300 - 200);
  });
});
