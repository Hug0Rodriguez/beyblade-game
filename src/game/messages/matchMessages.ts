import { defineMessage } from '@engine/messaging/defineMessage';

export const PointsAwarded = defineMessage('PointsAwarded', { spinnerId: 'u16', points: 'f64', total: 'f64' });
export const RoundScored = defineMessage('RoundScored', {});
export const MatchWon = defineMessage('MatchWon', { spinnerId: 'u16', name: 'str' });

export const matchMessages = [PointsAwarded, RoundScored, MatchWon];
