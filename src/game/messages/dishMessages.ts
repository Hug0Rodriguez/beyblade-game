import { defineMessage } from '@engine/messaging/defineMessage';

/** Bowl slope acceleration for a grounded Rig this step. */
export const DishForcesComputed = defineMessage('DishForcesComputed', { rigId: 'u16', ax: 'f64', ay: 'f64' });

/** A Rig hit the Rim wall. n points back into the Dish. */
export const RimHit = defineMessage('RimHit', {
  rigId: 'u16',
  nx: 'f64',
  ny: 'f64',
  depth: 'f64',
  restitution: 'f64',
});

/** A Rig left the Dish (through a Lip gap, or over the Rim while airborne). */
export const RigSpilled = defineMessage('RigSpilled', { rigId: 'u16' });

export const dishMessages = [DishForcesComputed, RimHit, RigSpilled];
