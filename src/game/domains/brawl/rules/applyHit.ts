import type { Vec2 } from '@shared/math/vec2';
import type { GearRow, HitSpec } from '../../../gameData/schema/brawlData';
import { gearOf } from './gears';

export interface HitBodies {
  /** Attacker and defender velocities (mutated). */
  readonly attacker: Vec2;
  readonly defender: Vec2;
  defenderWeight: number;
  /** The attacker's base speed (its Gear is its speed in multiples of this). */
  attackerBaseSpeed: number;
}

export interface HitResult {
  damage: number;
  attackerSpeed: number;
  launchVz: number;
  /** The Gear the hit landed at (read off gears.json from the hit's speed). */
  gear: number;
}

/**
 * An attack connecting. n points from attacker to defender.
 * - Damage and knockback are the hit's base × the attacker's **Gear** (its speed in four
 *   readable steps, gears.json) × the Rev multiplier. Hits with gearScaled false ignore Gear.
 * - The defender is knocked back along n, or toward the attacker's stick when `aimKnockback`
 *   (the Hook's sling), and launched upward by launchVz (downward when negative: the Spike).
 * - The attacker **ricochets**: its velocity reflects off the contact, keeps `ricochetKeep`
 *   of its speed (at least `ricochetMinSpeed`), and bends toward the stick by `ricochetAim`,
 *   never back into the defender.
 */
export function applyHit(
  bodies: HitBodies,
  nx: number,
  ny: number,
  steerX: number,
  steerY: number,
  spec: HitSpec,
  multiplier: number,
  gears: readonly GearRow[],
  out: HitResult,
): HitResult {
  const { attacker, defender } = bodies;
  // A reversed hit (Deflect) is powered by the incoming attack's speed.
  const attackerSpeed = Math.max(Math.hypot(attacker.x, attacker.y), spec.reverse ? Math.hypot(defender.x, defender.y) : 0);
  out.attackerSpeed = attackerSpeed;
  out.gear = gearOf(gears, attackerSpeed, bodies.attackerBaseSpeed);
  const gear = spec.gearScaled === false ? undefined : gears[out.gear];
  out.damage = (spec.damage ?? 0) * (gear?.damageMultiplier ?? 1) * multiplier;
  out.launchVz = spec.launchVz ?? 0;

  // Defender: knocked away along n (or where the attacker aims), keeping a little of its sideways motion.
  const knock = ((spec.knockback ?? 0) * (gear?.knockbackMultiplier ?? 1)) / Math.max(0.1, bodies.defenderWeight);
  const stick = Math.hypot(steerX, steerY);
  const knockX = spec.aimKnockback && stick > 0 ? steerX / stick : nx;
  const knockY = spec.aimKnockback && stick > 0 ? steerY / stick : ny;
  const tangent = defender.x * -knockY + defender.y * knockX;
  defender.x = knockX * knock + -knockY * tangent * 0.3;
  defender.y = knockY * knock + knockX * tangent * 0.3;

  // Attacker: reflect off the contact normal, then bend toward the stick.
  const into = attacker.x * nx + attacker.y * ny;
  let rx = into > 0 ? attacker.x - 2 * into * nx : attacker.x;
  let ry = into > 0 ? attacker.y - 2 * into * ny : attacker.y;
  let rLength = Math.hypot(rx, ry);
  if (rLength < 1e-6) {
    rx = -nx;
    ry = -ny;
    rLength = 1;
  }
  let dirX = rx / rLength;
  let dirY = ry / rLength;
  const aim = spec.ricochetAim ?? 0;
  if (stick > 0 && aim > 0) {
    dirX = dirX * (1 - aim) + (steerX / stick) * aim;
    dirY = dirY * (1 - aim) + (steerY / stick) * aim;
    // Never ricochet back into the defender.
    const back = dirX * nx + dirY * ny;
    if (back > 0) {
      dirX -= back * nx;
      dirY -= back * ny;
    }
    const length = Math.hypot(dirX, dirY);
    if (length < 1e-6) {
      dirX = -nx;
      dirY = -ny;
    } else {
      dirX /= length;
      dirY /= length;
    }
  }
  const speed = Math.max(spec.ricochetMinSpeed ?? 0, attackerSpeed * (spec.ricochetKeep ?? 0));
  attacker.x = dirX * speed;
  attacker.y = dirY * speed;
  return out;
}

/** Plain elastic-ish collision along n (A→B) by weight. Only when the bodies approach. */
export function bounce(a: Vec2, b: Vec2, weightA: number, weightB: number, nx: number, ny: number, restitution: number): number {
  const approach = (a.x - b.x) * nx + (a.y - b.y) * ny;
  if (approach <= 0) return 0;
  const impulse = ((1 + restitution) * approach) / (1 / weightA + 1 / weightB);
  a.x -= (impulse / weightA) * nx;
  a.y -= (impulse / weightA) * ny;
  b.x += (impulse / weightB) * nx;
  b.y += (impulse / weightB) * ny;
  return approach;
}
