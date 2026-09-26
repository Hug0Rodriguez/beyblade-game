import type { MessageType } from '@engine/messaging/defineMessage';
import type { Schema } from '@engine/tables/columns';
import { brawlMessages } from './brawlMessages';
import { dishMessages } from './dishMessages';
import { flowMessages } from './flowMessages';
import { matchMessages } from './matchMessages';
import { moveMessages } from './moveMessages';
import { rigMessages } from './rigMessages';
import { roundMessages } from './roundMessages';
import { spinnerMessages } from './spinnerMessages';
import { styleMessages } from './styleMessages';

/** Every game message contract. The only code the domains share. */
export const gameMessages: readonly MessageType<Schema>[] = [
  ...flowMessages,
  ...spinnerMessages,
  ...rigMessages,
  ...moveMessages,
  ...brawlMessages,
  ...dishMessages,
  ...styleMessages,
  ...roundMessages,
  ...matchMessages,
] as readonly MessageType<Schema>[];
