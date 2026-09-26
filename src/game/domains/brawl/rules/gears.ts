import type { GearRow } from '../../../gameData/schema/brawlData';

/** The Gear (row index in gears.json) for a speed, as a multiple of the Rig's base speed (no memory: hit power). */
export function gearOf(gears: readonly GearRow[], speed: number, baseSpeed: number): number {
  const ratio = speed / Math.max(1, baseSpeed);
  let gear = 0;
  for (let i = 0; i < gears.length; i++) if (ratio >= gears[i].minSpeedRatio) gear = i;
  return gear;
}

/**
 * The Gear a Rig shows next step: it rises as soon as a threshold is reached, but only drops
 * once speed falls `dropMargin` below the current Gear's threshold (no flicker at the edge).
 */
export function nextGear(gears: readonly GearRow[], current: number, speed: number, baseSpeed: number, dropMargin: number): number {
  const raw = gearOf(gears, speed, baseSpeed);
  if (raw >= current) return raw;
  const ratio = speed / Math.max(1, baseSpeed);
  let gear = current;
  while (gear > raw && ratio < gears[gear].minSpeedRatio * (1 - dropMargin)) gear--;
  return gear;
}
