import { defineMessage } from '@engine/messaging/defineMessage';

/** A Rig's Rev: points, Rank (index into revRanks), progress to the next Rank, multiplier, sustain. */
export const RevChanged = defineMessage('RevChanged', {
  rigId: 'u16',
  points: 'f64',
  rank: 'u16',
  rankName: 'str',
  color: 'str',
  progress: 'f64',
  multiplier: 'f64',
  sustaining: 'u8',
});

/**
 * Rev earned or lost (callouts). `reason` = hit name, "afterRim", "hitTaken" or "countered";
 * `amount` < 0 for a loss; `stale` = 1 when a repeat earned less than full (variety window).
 */
export const RevGained = defineMessage('RevGained', { rigId: 'u16', reason: 'str', amount: 'f64', stale: 'u8' });

/** Whether the Rig can use the Shatter right now. */
export const ShatterReady = defineMessage('ShatterReady', { rigId: 'u16', ready: 'u8' });

/** The Shatter charging at ZENITH: 0..1 (1 = charged). Published in steps, not every frame. */
export const ShatterCharging = defineMessage('ShatterCharging', { rigId: 'u16', progress: 'f64' });

/** A Rig entered (1) or left (0) Redline: low Spin, boosted Rev gains, a Rank floor. */
export const RedlineChanged = defineMessage('RedlineChanged', { rigId: 'u16', active: 'u8' });

export const styleMessages = [RevChanged, RevGained, ShatterReady, RedlineChanged, ShatterCharging];
