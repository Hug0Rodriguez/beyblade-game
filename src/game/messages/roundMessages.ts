import { defineMessage } from '@engine/messaging/defineMessage';

export const RoundStarted = defineMessage('RoundStarted', { roundNo: 'u16' });
/** One beat of the drop-in countdown; `go` = the last beat (control goes live). */
export const CountdownBeat = defineMessage('CountdownBeat', { beat: 'u16', label: 'str', go: 'u8' });
export const CountdownFinished = defineMessage('CountdownFinished', {});
export const RoundFinished = defineMessage('RoundFinished', { loserRigId: 'u16', finish: 'str', points: 'f64' });

export const roundMessages = [RoundStarted, CountdownBeat, CountdownFinished, RoundFinished];
