import { defineMessage } from '@engine/messaging/defineMessage';

export const RigBodiesMoved = defineMessage('RigBodiesMoved', {
  rigId: 'u16',
  x: 'f64',
  y: 'f64',
  z: 'f64',
  vx: 'f64',
  vy: 'f64',
  vz: 'f64',
  airborne: 'u8',
  teleported: 'u8',
});

/** Two Rigs touched (first step of contact). n points from A to B. */
export const ContactDetected = defineMessage('ContactDetected', {
  rigA: 'u16',
  rigB: 'u16',
  speed: 'f64',
  nx: 'f64',
  ny: 'f64',
  x: 'f64',
  y: 'f64',
});

/** An attack connected. `hit` names the hits.json row; `afterRim` = the attacker bounced off the Rim just before. */
export const HitLanded = defineMessage('HitLanded', {
  attackerId: 'u16',
  defenderId: 'u16',
  hit: 'str',
  damage: 'f64',
  speed: 'f64',
  x: 'f64',
  y: 'f64',
  nx: 'f64',
  ny: 'f64',
  afterRim: 'u8',
  /** The Gear the hit landed at. */
  gear: 'u8',
});

/** A Rig's Gear (its speed in four readable steps, gears.json) changed. */
export const GearChanged = defineMessage('GearChanged', { rigId: 'u16', gear: 'u8' });

/** A Rig touched down. */
export const Landed = defineMessage('Landed', { rigId: 'u16', impactSpeed: 'f64', x: 'f64', y: 'f64' });

/** An attack move ended without landing a hit. */
export const AttackWhiffed = defineMessage('AttackWhiffed', { rigId: 'u16', move: 'str' });

export const brawlMessages = [RigBodiesMoved, ContactDetected, HitLanded, GearChanged, Landed, AttackWhiffed];
