import type { Scalar } from '@engine/state/conditionTable/operators';
import type { DishDefinition } from '../../../../gameData/schema/dishData';
import type { MovesData } from '../../../../gameData/schema/movesData';
import type { ObservedRigTable } from '../../state/spinnerState';

/** What a CPU Spinner perceives each decision. Keys are the cpuTactics guard columns. */
export interface CpuSenses {
  distanceToRival: number;
  /** Own distance from the Dish centre / Dish radius (1 = at the Rim). */
  edgeRatio: number;
  timeSinceStrike: number;
  spinRatio: number;
  rivalSpinRatio: number;
  rivalSpeed: number;
  /** How fast the rival is closing in (positive = approaching). */
  closingSpeed: number;
  airborne: number;
  rivalAirborne: number;
  rivalMove: string;
  /** 1 while the rival is stunned, launched or recovering (moveTuning.vulnerableStates): Dive now. */
  rivalVulnerable: number;
  move: string;
  shatterReady: number;
  /** Own and the rival's Gear (0–3): speed built up to spend on the next attack. */
  gear: number;
  rivalGear: number;
  /** The rival's Rev Rank (at the Shatter Rank it's charging a finisher: pressure it). */
  rivalRank: number;
  /** Where the Rim Line runs, as a fraction of the Dish radius (the rideRim steer aims for it). */
  rimLineRatio: number;
  /** 1 while this Rig is recovering or stunned with a Rank to spend: it can Rev Cancel out. */
  canRevCancel: number;
  /** A fresh 0..1 roll each decision, so Tactics can have chances ("roll" < "$deflectChance"). */
  roll: number;
  selfX: number;
  selfY: number;
  rivalX: number;
  rivalY: number;
  hasRival: number;
}

export const cpuSenseColumns = [
  'distanceToRival',
  'edgeRatio',
  'timeSinceStrike',
  'spinRatio',
  'rivalSpinRatio',
  'rivalSpeed',
  'closingSpeed',
  'airborne',
  'rivalAirborne',
  'rivalMove',
  'rivalVulnerable',
  'move',
  'shatterReady',
  'gear',
  'rivalGear',
  'rivalRank',
  'canRevCancel',
  'roll',
] as const;

export function createSenses(): CpuSenses {
  return {
    distanceToRival: 0, edgeRatio: 0, timeSinceStrike: 0, spinRatio: 0, rivalSpinRatio: 0, rivalSpeed: 0,
    closingSpeed: 0, airborne: 0, rivalAirborne: 0, rivalMove: '', rivalVulnerable: 0, move: '', shatterReady: 0, gear: 0, rivalGear: 0, rivalRank: 0, rimLineRatio: 0, canRevCancel: 0, roll: 0,
    selfX: 0, selfY: 0, rivalX: 0, rivalY: 0, hasRival: 0,
  };
}

export function readSense(senses: CpuSenses, column: string): Scalar {
  return senses[column as keyof CpuSenses];
}

/** Fills `out` for Rig `selfId` against the nearest other observed Rig. */
export function senseRival(
  out: CpuSenses,
  rigs: ObservedRigTable,
  selfId: number,
  dish: Pick<DishDefinition, 'radius' | 'rimLine'>,
  timeSinceStrike: number,
  moves: Pick<MovesData['moveTuning'], 'vulnerableStates' | 'revCancel'>,
): CpuSenses {
  const c = rigs.cols;
  let self = -1;
  for (let row = 0; row < rigs.count; row++) if (rigs.ids[row] === selfId) self = row;
  out.hasRival = 0;
  if (self === -1) return out;
  out.selfX = c.x[self];
  out.selfY = c.y[self];
  out.edgeRatio = Math.hypot(out.selfX, out.selfY) / dish.radius;
  out.rimLineRatio = (dish.rimLine.innerRatio + dish.rimLine.outerRatio) / 2;
  out.gear = c.gear[self];
  out.canRevCancel = moves.revCancel.states.includes(out.move) && c.rank[self] >= moves.revCancel.rankCost ? 1 : 0;
  out.spinRatio = c.spinRatio[self];
  out.airborne = c.airborne[self];
  out.move = c.move[self];
  out.shatterReady = c.shatterReady[self];
  out.timeSinceStrike = timeSinceStrike;

  let best = -1;
  let bestDistance = Infinity;
  for (let row = 0; row < rigs.count; row++) {
    if (row === self) continue;
    const distance = Math.hypot(c.x[row] - out.selfX, c.y[row] - out.selfY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = row;
    }
  }
  if (best === -1) return out;
  out.hasRival = 1;
  out.rivalX = c.x[best];
  out.rivalY = c.y[best];
  out.distanceToRival = bestDistance;
  out.rivalSpinRatio = c.spinRatio[best];
  out.rivalAirborne = c.airborne[best];
  out.rivalMove = c.move[best];
  out.rivalGear = c.gear[best];
  out.rivalRank = c.rank[best];
  out.rivalVulnerable = moves.vulnerableStates.includes(out.rivalMove) ? 1 : 0;
  out.rivalSpeed = Math.hypot(c.vx[best], c.vy[best]);
  const toSelfX = (out.selfX - out.rivalX) / Math.max(1, bestDistance);
  const toSelfY = (out.selfY - out.rivalY) / Math.max(1, bestDistance);
  out.closingSpeed = c.vx[best] * toSelfX + c.vy[best] * toSelfY;
  return out;
}
