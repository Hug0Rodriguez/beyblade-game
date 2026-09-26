import { createDataValidator } from '@engine/data/validators';
import { findConditionErrors } from '@engine/state/conditionTable/evaluateConditionTable';
import { findFsmErrors } from '@engine/state/fsm/fsmDefinition';
import { hitColumns } from '../domains/brawl';
import { moveColumns } from '../domains/moves';
import { finishColumns } from '../domains/round';
import { cpuSenseColumns, steerModes } from '../domains/spinner';
import { maxVarietyWindow } from '../domains/style';
import type { GameData } from './gameData';

const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);

/** Cross-file checks: every id resolves, every FSM is reachable, every condition names a real column. */
export function validateGameData(data: GameData): void {
  const v = createDataValidator();
  const { spinner, rig, moves, brawl, dish, round, flow, screens } = data;

  // Spinners, Rigs and CPU profiles.
  const spinnerIds = spinner.spinners.map((entry) => entry.id);
  spinner.spinners.forEach((entry, i) => {
    v.requireOneOf(`spinner/spinners[${i}].controller`, entry.controller, ['human', 'cpu']);
    v.requireRange(`spinner/spinners[${i}].id`, entry.id, 0, data.boot.capacities.spinners - 1);
    v.requireRef(`spinner/spinners[${i}].rigId`, entry.rigId, ids(rig.rigs));
    if (entry.controller === 'cpu') v.requireRef(`spinner/spinners[${i}].profileId`, entry.profileId, ids(spinner.cpuProfiles));
  });
  if (new Set(spinnerIds).size !== spinnerIds.length) v.error('spinner/spinners: ids must be unique');
  if (spinner.spinners.length > data.boot.capacities.rigs) v.error('boot/capacities.rigs: fewer than the Spinners');
  rig.rigs.forEach((entry, i) => {
    v.requireRange(`rig/rigs[${i}].radius`, entry.radius, 4, 80);
    v.requireRange(`rig/rigs[${i}].weight`, entry.weight, 0.1, 10);
    v.requireRange(`rig/rigs[${i}].maxSpin`, entry.maxSpin, 1, 10000);
  });
  for (const state of spinner.cpuTactics.states) {
    const command = spinner.tacticCommands[state];
    if (!command) {
      v.error(`spinner/cpu/tacticCommands: missing command for Tactic "${state}"`);
      continue;
    }
    v.requireRef(`spinner/cpu/tacticCommands.${state}.steer`, command.steer, Object.keys(steerModes));
    if (command.combo) v.requireRef(`spinner/cpu/tacticCommands.${state}.combo`, command.combo, ids(spinner.cpuCombos));
  }

  // Touch: the landscape layout only repositions buttons that exist.
  const touchWidgets = spinner.touch.buttons.map((button) => button.widget);
  for (const widget of Object.keys(spinner.touch.landscape?.buttons ?? {})) {
    v.requireRef('spinner/human/touch.landscape.buttons', widget, touchWidgets);
  }

  // Moves: every move in the table is a moveFlow state with tuning.
  const moveNames = Object.keys(moves.moveTuning.moves);
  for (const row of moves.moveTable) {
    v.requireRef('moves/moveTable.move', row.move, moveNames);
    v.requireRef('moves/moveTable.move (moveFlow state)', row.move, moves.moveFlow.states);
  }
  moves.moveTuning.lockedStates.forEach((state) => v.requireRef('moves/moveTuning.lockedStates', state, moves.moveFlow.states));
  moves.moveTuning.vulnerableStates.forEach((state) => v.requireRef('moves/moveTuning.vulnerableStates', state, moves.moveFlow.states));
  brawl.motion.noControlStates.forEach((state) => v.requireRef('brawl/motion.noControlStates', state, moves.moveFlow.states));
  moves.moveTuning.chainedMoves.forEach((move) => v.requireRef('moves/moveTuning.chainedMoves', move, moveNames));
  moves.moveTuning.revCancel.states.forEach((state) => v.requireRef('moves/moveTuning.revCancel.states', state, moves.moveFlow.states));
  brawl.motion.homingStates.forEach((state) => v.requireRef('brawl/motion.homingStates', state, moves.moveFlow.states));
  brawl.motion.brakeStates.forEach((state) => v.requireRef('brawl/motion.brakeStates', state, moves.moveFlow.states));
  for (const [tell, look] of Object.entries(brawl.brawlFx.tells)) {
    if ('moves' in look) look.moves.forEach((state) => v.requireRef(`brawl/brawlFx.tells.${tell}.moves`, state, moves.moveFlow.states));
  }

  // Hits: every outcome names a hits.json row; hit events are moveFlow events.
  const hitNames = Object.keys(brawl.hits);
  brawl.hitOutcomes.forEach((row, i) => v.requireRef(`brawl/hitOutcomes[${i}].hit`, row.hit, hitNames));
  const moveEvents = moves.moveFlow.transitions.flatMap((t) => (t.on ? [t.on] : []));
  for (const [name, spec] of Object.entries(brawl.hits)) {
    v.requireOneOf(`brawl/hits.${name}.effect`, spec.effect, ['none', 'bounce', 'hit']);
    if (spec.defenderEvent) v.requireRef(`brawl/hits.${name}.defenderEvent`, spec.defenderEvent, moveEvents);
    if (spec.attackerEvent) v.requireRef(`brawl/hits.${name}.attackerEvent`, spec.attackerEvent, moveEvents);
    if (spec.onRim) v.requireRef(`brawl/hits.${name}.onRim`, spec.onRim, hitNames);
  }
  brawl.gears.gears.forEach((gear, i) => {
    if (i === 0 && gear.minSpeedRatio !== 0) v.error('brawl/gears.gears[0]: minSpeedRatio must be 0');
    if (i > 0 && gear.minSpeedRatio <= brawl.gears.gears[i - 1].minSpeedRatio) v.error(`brawl/gears.gears[${i}]: minSpeedRatio must increase`);
  });
  if (!brawl.hitOutcomes.some((row) => row.when.length === 0)) v.error('brawl/hitOutcomes: needs a catch-all row ("when": [])');

  // Style: Ranks climb, special Ranks exist, the variety window fits.
  const { ranks, sustainFromRank, shatterRank, maxPoints } = data.style.revRanks;
  ranks.forEach((rank, i) => {
    if (i > 0 && rank.threshold <= ranks[i - 1].threshold) v.error(`style/revRanks.ranks[${i}]: thresholds must increase`);
  });
  if (ranks[0]?.threshold !== 0) v.error('style/revRanks.ranks[0]: threshold must be 0');
  v.requireRange('style/revRanks.sustainFromRank', sustainFromRank, 0, ranks.length);
  v.requireRange('style/revRanks.shatterRank', shatterRank, 0, ranks.length - 1);
  v.requireRange('style/revRanks.maxPoints', maxPoints, ranks.at(-1)?.threshold ?? 0, Infinity);
  v.requireRange('style/revRules.varietyWindow', data.style.revRules.varietyWindow, 0, maxVarietyWindow);
  for (const hit of Object.keys(data.style.revGains.hits)) v.requireRef('style/revGains.hits', hit, hitNames);
  for (const hit of Object.keys(data.style.revRules.lossPenaltyRatios)) v.requireRef('style/revRules.lossPenaltyRatios', hit, hitNames);
  for (const hit of Object.keys(data.style.revRules.spendOnHit)) v.requireRef('style/revRules.spendOnHit', hit, hitNames);
  v.requireRange('style/revRules.redline.floorRank', data.style.revRules.redline.floorRank, 0, ranks.length - 1);
  v.requireRange('brawl/gears.dropMargin', brawl.gears.dropMargin, 0, 0.9);
  data.hud.hud.callout.bigHits.forEach((hit) => v.requireRef('hud/hud.callout.bigHits', hit, hitNames));
  round.roundRules.shatterHits.forEach((hit) => v.requireRef('round/roundRules.shatterHits', hit, hitNames));

  // FSMs and condition tables.
  v.errors(findFsmErrors('flow/gameFlow', flow.gameFlow, ['timeInState']));
  v.errors(findFsmErrors('round/roundFlow', round.roundFlow, ['timeInState']));
  v.errors(findFsmErrors('moves/moveFlow', moves.moveFlow, ['timeInState']));
  v.errors(findFsmErrors('spinner/cpu/cpuTactics', spinner.cpuTactics, ['timeInState', ...cpuSenseColumns]));
  v.errors(findConditionErrors('moves/moveTable', moves.moveTable, moveColumns(moveNames)));
  v.errors(findConditionErrors('brawl/hitOutcomes', brawl.hitOutcomes, hitColumns));
  v.errors(findConditionErrors('round/finishConditions', round.finishConditions, finishColumns));
  v.errors(findConditionErrors('match/matchRules.winWhen', [{ when: data.match.matchRules.winWhen }], ['points']));

  // Dish, flow activities, screens.
  v.requireRef('dish/dishes.selected', dish.dishes.selected, ids(dish.dishes.dishes));
  const flowStates = flow.gameFlow.states;
  for (const [activity, states] of Object.entries(flow.activity)) {
    if (!Array.isArray(states)) continue;
    states.forEach((state: string) => v.requireRef(`flow/activity.${activity}`, state, flowStates));
  }
  for (const state of Object.keys(flow.activity.menus)) v.requireRef('flow/activity.menus', state, flowStates);
  const layers = screens.screens.layers.map((layer) => layer.name);
  for (const [state, visible] of Object.entries(screens.screens.visibleIn)) {
    v.requireRef('screens/screens.visibleIn', state, flowStates);
    visible.forEach((layer) => v.requireRef(`screens/screens.visibleIn.${state}`, layer, layers));
  }
  v.requireRef('match/matchRules.settleWhen.state', data.match.matchRules.settleWhen.state, round.roundFlow.states);
  if (round.countdown.slots.length < spinner.spinners.length) v.error('round/countdown.slots: needs one slot per Spinner');
  if (round.countdown.beats.length === 0) v.error('round/countdown.beats: needs at least one beat');

  v.throwIfAny('Invalid game data:');
}
