import { StepTicked } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { evaluateGuards, startInstance, stateOf, tickFsm } from '@engine/state/fsm/fsmRuntime';
import { rotateInto, type Vec2 } from '@shared/math/vec2';
import { RoundStarted } from '../../../messages/roundMessages';
import { SpinnerCommandIssued } from '../../../messages/spinnerMessages';
import type { ButtonName } from '../../../gameData/schema/spinnerData';
import type { DomainContext } from '../../../shared/domainContext';
import { isActive } from '../../../shared/flowWatch';
import { rigOfSpinner } from '../../../shared/ids';
import { selectedDish } from '../../../shared/dataLookups';
import { createSenses, readSense, senseRival } from '../rules/cpu/senseRival';
import { steerModes } from '../rules/cpu/steerModes';
import type { SpinnerState } from '../state/spinnerState';

const queuedColumn: Readonly<Record<ButtonName, 'dashQueued' | 'popQueued' | 'whirlQueued' | 'hookQueued'>> = {
  dash: 'dashQueued',
  pop: 'popQueued',
  whirl: 'whirlQueued',
  hook: 'hookQueued',
};

/**
 * CPU Spinners: the cpuTactics FSM (guards read the CPU's senses, $refs its profile) picks a
 * Tactic; tacticCommands.json says how that Tactic steers, which buttons it presses on entry
 * and which timed combo script it runs.
 */
export function cpuHandlers(state: SpinnerState, ctx: DomainContext): HandlerDef[] {
  const senses = createSenses();
  const steer: Vec2 = { x: 0, y: 0 };
  const c = state.cpus.cols;

  const press = (row: number, button: ButtonName) => {
    c[queuedColumn[button]][row] = 1;
    if (button !== 'pop') c.timeSinceStrike[row] = 0;
  };

  const startCombo = (row: number, comboId: string | undefined) => {
    c.comboIndex[row] = comboId ? ctx.data.spinner.cpuCombos.findIndex((combo) => combo.id === comboId) : -1;
    c.comboTime[row] = 0;
    c.comboStep[row] = 0;
  };

  const runCombo = (row: number, dt: number) => {
    const combo = ctx.data.spinner.cpuCombos[c.comboIndex[row]];
    if (!combo) return;
    c.comboTime[row] += dt;
    while (c.comboStep[row] < combo.steps.length && combo.steps[c.comboStep[row]].at <= c.comboTime[row]) {
      press(row, combo.steps[c.comboStep[row]].press);
      c.comboStep[row]++;
    }
    if (c.comboStep[row] >= combo.steps.length) c.comboIndex[row] = -1;
  };

  const decide = (row: number) => {
    const spinnerId = state.cpus.ids[row];
    const profile = ctx.data.spinner.cpuProfiles[c.profileIndex[row]];
    senseRival(senses, state.observedRigs, rigOfSpinner(spinnerId), selectedDish(ctx.data), c.timeSinceStrike[row], ctx.data.moves.moveTuning);
    if (senses.hasRival === 0) return;
    senses.roll = state.random.next();
    const entered = evaluateGuards(state.tactics, spinnerId, (column) => readSense(senses, column), profile);
    const tactic = ctx.data.spinner.tacticCommands[stateOf(state.tactics, spinnerId) ?? ''];
    if (!tactic) return;
    if (entered !== undefined) startCombo(row, tactic.combo);
    if (entered !== undefined || tactic.repeatPress) for (const button of tactic.press) press(row, button);
    (steerModes[tactic.steer] ?? steerModes.hold)(steer, senses);
    rotateInto(steer, steer.x, steer.y, state.random.range(-profile.steerJitter, profile.steerJitter));
    c.steerX[row] = steer.x * tactic.steerScale;
    c.steerY[row] = steer.y * tactic.steerScale;
  };

  return [
    on(RoundStarted, 'spinner.onRoundStarted', () => {
      for (let row = 0; row < state.cpus.count; row++) {
        c.decisionTimer[row] = 0;
        c.timeSinceStrike[row] = 0;
        c.steerX[row] = 0;
        c.steerY[row] = 0;
        c.dashQueued[row] = 0;
        c.popQueued[row] = 0;
        c.whirlQueued[row] = 0;
        c.hookQueued[row] = 0;
        startCombo(row, undefined);
        startInstance(state.tactics, state.cpus.ids[row]);
      }
    }),
    on(StepTicked, 'spinner.decideCpuCommands', (batch) => {
      if (!isActive(state.flow, ctx.data.flow.activity.commands)) return;
      const dt = batch.cols.dt[batch.count - 1];
      tickFsm(state.tactics, dt);
      for (let row = 0; row < state.cpus.count; row++) {
        const profile = ctx.data.spinner.cpuProfiles[c.profileIndex[row]];
        c.timeSinceStrike[row] += dt;
        c.decisionTimer[row] -= dt;
        if (c.decisionTimer[row] <= 0) {
          c.decisionTimer[row] = profile.decisionSeconds;
          decide(row);
        }
        runCombo(row, dt);
        ctx.publish(SpinnerCommandIssued, {
          aimX: 0,
          aimY: 0,
          spinnerId: state.cpus.ids[row],
          steerX: c.steerX[row],
          steerY: c.steerY[row],
          dash: c.dashQueued[row],
          pop: c.popQueued[row],
          whirl: c.whirlQueued[row],
          hook: c.hookQueued[row],
        });
        c.dashQueued[row] = 0;
        c.popQueued[row] = 0;
        c.whirlQueued[row] = 0;
        c.hookQueued[row] = 0;
      }
    }),
  ];
}
