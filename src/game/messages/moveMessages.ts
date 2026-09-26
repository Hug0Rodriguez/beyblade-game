import { defineMessage } from '@engine/messaging/defineMessage';

/** A Rig entered a move state that has tuning (pressed, or reached by a timer, e.g. rev-up → dash). `dir` is the aim (the stick, or 0 = facing). */
export const MoveStarted = defineMessage('MoveStarted', { rigId: 'u16', move: 'str', dirX: 'f64', dirY: 'f64' });

/** A button was pressed while the Rig was committed (tell, active or recovery): nothing happens, and the view says so. */
export const MoveRefused = defineMessage('MoveRefused', { rigId: 'u16', button: 'str' });

/** A press during recovery or stun was bought with Rev: the Rig left `fromState` for `move`. */
export const RevCancelled = defineMessage('RevCancelled', { rigId: 'u16', fromState: 'str', move: 'str' });

export const moveMessages = [MoveStarted, MoveRefused, RevCancelled];
