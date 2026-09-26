import { firstMatch } from '@engine/state/conditionTable/evaluateConditionTable';
import type { Scalar } from '@engine/state/conditionTable/operators';
import type { HitOutcomeRule, HitSpec } from '../../../gameData/schema/brawlData';

/** What the hit-outcome table reads for one attacker → defender pairing. */
export interface HitContext {
  attackKind: string;
  attackerMove: string;
  /** 1 while the attacker's move can still land a hit. */
  attackerActive: number;
  attackerAirborne: number;
  defenderMove: string;
  /** Seconds the defender has been in its current move. */
  defenderMoveAge: number;
  defenderAttackKind: string;
  defenderIFrames: number;
  defenderAirborne: number;
  /** 1 while the defender is stunned, launched or recovering (moveTuning.vulnerableStates). */
  defenderVulnerable: number;
  /** 1 when the attacker is above the defender by more than half the contact height. */
  attackerAbove: number;
  attackerSpeed: number;
}

export const hitColumns: readonly string[] = [
  'attackKind',
  'attackerMove',
  'attackerActive',
  'attackerAirborne',
  'defenderMove',
  'defenderMoveAge',
  'defenderAttackKind',
  'defenderIFrames',
  'defenderAirborne',
  'defenderVulnerable',
  'attackerAbove',
  'attackerSpeed',
];

export function createHitContext(): HitContext {
  return {
    attackKind: 'none', attackerMove: '', attackerActive: 0, attackerAirborne: 0, defenderMove: '', defenderMoveAge: 0,
    defenderAttackKind: 'none', defenderIFrames: 0, defenderAirborne: 0, defenderVulnerable: 0, attackerAbove: 0, attackerSpeed: 0,
  };
}

/** The hitOutcomes row for this pairing (lowest priority wins). */
export function resolveHit(rows: readonly HitOutcomeRule[], context: HitContext, refs: Readonly<Record<string, unknown>>): HitOutcomeRule | undefined {
  return firstMatch(rows, (column): Scalar => context[column as keyof HitContext], refs);
}

/**
 * Which direction of a contact happens: A's outcome on B, or B's on A (lower priority wins,
 * ties go to the faster Rig). An outcome whose hit has no effect ("ghost": the target has
 * i-frames) only means *that* direction doesn't land; it never blocks the other direction.
 * Returns 'a', 'b', or undefined when neither direction does anything.
 */
export function pickDirection(
  ab: HitOutcomeRule | undefined,
  ba: HitOutcomeRule | undefined,
  hits: Readonly<Record<string, HitSpec>>,
  speedA: number,
  speedB: number,
): 'a' | 'b' | undefined {
  const rank = (outcome: HitOutcomeRule | undefined) =>
    outcome && hits[outcome.hit] && hits[outcome.hit].effect !== 'none' ? (outcome.priority ?? Infinity) : Infinity;
  const a = rank(ab);
  const b = rank(ba);
  if (a === Infinity && b === Infinity) return undefined;
  return a < b || (a === b && speedA >= speedB) ? 'a' : 'b';
}
