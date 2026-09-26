import { createJsonTree, type JsonModules } from '@engine/data/loadJsonTree';
import type { GameData } from './gameData';

const modules = import.meta.glob('/data/game/**/*.json', { eager: true, import: 'default' });

/**
 * Builds the GameData tree from data/game. Each object is the parsed JSON itself,
 * so live edits (tuning panel) are seen by every reader.
 */
export function loadGameData(source: JsonModules = modules): GameData {
  const tree = createJsonTree(source, '/data/game');
  return {
    messaging: { routes: tree.get('messaging/routes.json') },
    boot: {
      capacities: tree.get('boot/capacities.json'),
      bootMessages: tree.get('boot/bootMessages.json'),
      random: tree.get('boot/random.json'),
    },
    flow: { gameFlow: tree.get('flow/gameFlow.json'), activity: tree.get('flow/activity.json') },
    spinner: {
      spinners: tree.get('spinner/spinners.json'),
      keyboard: tree.get('spinner/human/keyboard.json'),
      touch: tree.get('spinner/human/touch.json'),
      cpuProfiles: tree.get('spinner/cpu/cpuProfiles.json'),
      cpuTactics: tree.get('spinner/cpu/cpuTactics.json'),
      tacticCommands: tree.get('spinner/cpu/tacticCommands.json'),
      cpuCombos: tree.get('spinner/cpu/cpuCombos.json'),
    },
    rig: { rigs: tree.get('rig/rigs.json'), rigRules: tree.get('rig/rigRules.json') },
    moves: {
      moveFlow: tree.get('moves/moveFlow.json'),
      moveTable: tree.get('moves/moveTable.json'),
      moveTuning: tree.get('moves/moveTuning.json'),
    },
    brawl: {
      motion: tree.get('brawl/motion.json'),
      hitOutcomes: tree.get('brawl/hitOutcomes.json'),
      hits: tree.get('brawl/hits.json'),
      gears: tree.get('brawl/gears.json'),
      brawlFx: tree.get('brawl/brawlFx.json'),
      camera: tree.get('brawl/camera.json'),
    },
    dish: { dishes: tree.get('dish/dishes.json') },
    style: {
      revRanks: tree.get('style/revRanks.json'),
      revGains: tree.get('style/revGains.json'),
      revRules: tree.get('style/revRules.json'),
    },
    round: {
      roundFlow: tree.get('round/roundFlow.json'),
      roundRules: tree.get('round/roundRules.json'),
      finishConditions: tree.get('round/finishConditions.json'),
      countdown: tree.get('round/countdown.json'),
    },
    match: { matchRules: tree.get('match/matchRules.json') },
    hud: { hud: tree.get('hud/hud.json') },
    screens: { screens: tree.get('screens/screens.json'), copy: tree.get('screens/copy.json') },
  };
}

/** A deep, independent copy — tests mutate data without touching the shared tree. */
export function cloneGameData(data: GameData): GameData {
  return structuredClone(data);
}
