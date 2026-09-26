import type { AnyDomainModule } from '../shared/domainContext';
import { brawlDomain } from '../domains/brawl';
import { dishDomain } from '../domains/dish';
import { flowDomain } from '../domains/flow';
import { matchDomain } from '../domains/match';
import { movesDomain } from '../domains/moves';
import { rigDomain } from '../domains/rig';
import { roundDomain } from '../domains/round';
import { spinnerDomain } from '../domains/spinner';
import { styleDomain } from '../domains/style';
import { brawlScreen } from '../screens/brawl/brawlScreen';
import { matchResultScreen } from '../screens/matchResult/matchResultScreen';
import { titleScreen } from '../screens/title/titleScreen';
import { audioView } from '../audio/audioView';

/** Every module that takes part in the game. Order only affects view draw order (stage layering). */
export const domainRegistry: readonly AnyDomainModule[] = [
  flowDomain,
  spinnerDomain,
  dishDomain,
  rigDomain,
  movesDomain,
  brawlDomain,
  styleDomain,
  roundDomain,
  matchDomain,
  titleScreen,
  brawlScreen,
  matchResultScreen,
  audioView,
];
