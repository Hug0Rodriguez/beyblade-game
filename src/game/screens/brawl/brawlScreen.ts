import { createHintScreen } from '../hintScreen';

/** Brawl: the move keys along the bottom edge. */
export const brawlScreen = createHintScreen('screens.brawl', ['dropIn', 'brawl'], {
  keyboard: 'brawlHintKeyboard',
  touch: 'brawlHintTouch',
});
