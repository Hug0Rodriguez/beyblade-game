import { StateEntered, StepTicked } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { evaluateGuards, feedFsm, sendEvent, stateOf, tickFsm } from '@engine/state/fsm/fsmRuntime';
import { insert } from '@engine/tables/tableOps';
import { HitLanded } from '../../../messages/brawlMessages';
import { MatchStarted } from '../../../messages/flowMessages';
import { RigSpilled } from '../../../messages/dishMessages';
import { RigReady, RigSpinChanged } from '../../../messages/rigMessages';
import { CountdownBeat, CountdownFinished, RoundFinished, RoundStarted } from '../../../messages/roundMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { isActive, watchFlow } from '../../../shared/flowWatch';
import { findFinish } from '../rules/checkFinishes';
import type { RoundState } from '../state/roundState';

/** Rounds: the drop-in countdown, Finish checks, and the roundFlow FSM (brawling → finishing → scored). */
export function roundHandlers(state: RoundState, ctx: DomainContext): HandlerDef[] {
  const t = state.tracking.cols;
  const noColumns = (column: string): number => {
    throw new Error(`roundFlow guards can only read timeInState, not "${column}"`);
  };

  const advanceCountdown = (dt: number) => {
    const { beats, beatSeconds } = ctx.data.round.countdown;
    state.countdownTime += dt;
    const due = Math.min(beats.length - 1, Math.floor(state.countdownTime / beatSeconds));
    while (state.countdownBeat < due) {
      state.countdownBeat++;
      const go = state.countdownBeat === beats.length - 1;
      ctx.publish(CountdownBeat, { beat: state.countdownBeat, label: beats[state.countdownBeat], go: go ? 1 : 0 });
      if (go) ctx.publish(CountdownFinished, {});
    }
  };

  return [
    on(StateEntered, 'round.onFlowState', (batch) => {
      const entered = watchFlow(state.flow, batch);
      if (entered !== undefined && ctx.data.flow.activity.roundStartsOn.includes(entered)) {
        state.roundNo += 1;
        state.countdownTime = 0;
        state.countdownBeat = -1;
        ctx.publish(RoundStarted, { roundNo: state.roundNo });
      }
      feedFsm(state.roundFlow, batch, StateEntered.name);
    }),
    on(RoundStarted, 'round.onRoundStarted', () => {
      for (let row = 0; row < state.tracking.count; row++) {
        t.spin[row] = 1;
        t.spinRatio[row] = 1;
        t.spilled[row] = 0;
        t.shattered[row] = 0;
      }
    }),
    on(StepTicked, 'round.tick', (batch) => {
      const dt = batch.cols.dt[batch.count - 1];
      if (isActive(state.flow, ctx.data.flow.activity.roundStartsOn)) advanceCountdown(dt);
      tickFsm(state.roundFlow, dt);
      const rules = ctx.data.round.roundRules;
      if (isActive(state.flow, ctx.data.flow.activity.brawling) && rules.checkFinishesIn.includes(stateOf(state.roundFlow, 0) ?? '')) {
        const finish = findFinish(state.tracking, ctx.data.round.finishConditions, rules);
        if (finish) {
          ctx.publish(RoundFinished, { loserRigId: finish.rigId, finish: finish.condition.finish, points: finish.condition.points });
          sendEvent(state.roundFlow, 0, RoundFinished.name);
        }
      }
      evaluateGuards(state.roundFlow, 0, noColumns, rules);
    }),
    on(MatchStarted, 'round.onMatchStarted', () => {
      state.roundNo = 0;
    }),
    on(RigReady, 'round.onRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.tracking, batch.cols.rigId[i], { spin: 1, spinRatio: 1 });
    }),
    on(RigSpinChanged, 'round.trackSpin', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.tracking, batch.cols.rigId[i], { spin: batch.cols.spin[i], spinRatio: batch.cols.spinRatio[i] });
    }),
    on(HitLanded, 'round.trackShatter', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (ctx.data.round.roundRules.shatterHits.includes(batch.cols.hit[i])) insert(state.tracking, batch.cols.defenderId[i], { shattered: 1 });
      }
    }),
    on(RigSpilled, 'round.trackSpill', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.tracking, batch.cols.rigId[i], { spilled: 1 });
    }),
  ];
}
