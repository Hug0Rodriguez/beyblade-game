import { defineMessage } from '@engine/messaging/defineMessage';

export const RigReady = defineMessage('RigReady', {
  rigId: 'u16',
  spinnerId: 'u16',
  slot: 'u16',
  name: 'str',
  color: 'str',
  accentColor: 'str',
  radius: 'f64',
  weight: 'f64',
  baseSpeed: 'f64',
  maxSpin: 'f64',
  blades: 'u16',
});

export const RigSpinChanged = defineMessage('RigSpinChanged', { rigId: 'u16', spin: 'f64', spinRatio: 'f64' });

export const rigMessages = [RigReady, RigSpinChanged];
