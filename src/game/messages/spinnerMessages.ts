import { defineMessage } from '@engine/messaging/defineMessage';

export const SpinnerAssigned = defineMessage('SpinnerAssigned', {
  spinnerId: 'u16',
  slot: 'u16',
  name: 'str',
  controller: 'str',
  rigId: 'str',
});

/**
 * One step of intent from a Spinner (human or CPU). Buttons are 1 on the step they are pressed.
 * `aimX/aimY` is an explicit attack direction (a dragged button); zero means "aim where I steer".
 */
export const SpinnerCommandIssued = defineMessage('SpinnerCommandIssued', {
  spinnerId: 'u16',
  steerX: 'f64',
  steerY: 'f64',
  aimX: 'f64',
  aimY: 'f64',
  dash: 'u8',
  pop: 'u8',
  whirl: 'u8',
  hook: 'u8',
});

export const spinnerMessages = [SpinnerAssigned, SpinnerCommandIssued];
