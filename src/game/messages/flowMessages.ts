import { defineMessage } from '@engine/messaging/defineMessage';

export const GameBooted = defineMessage('GameBooted', {});
/** The title screen asked for a new Match. */
export const StartRequested = defineMessage('StartRequested', {});
export const MatchStarted = defineMessage('MatchStarted', {});
export const RematchRequested = defineMessage('RematchRequested', {});
export const TitleRequested = defineMessage('TitleRequested', {});

export const flowMessages = [GameBooted, StartRequested, MatchStarted, RematchRequested, TitleRequested];
