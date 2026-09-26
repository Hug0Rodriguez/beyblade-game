import { StateEntered, StepTicked } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { enterState, evaluateGuards, startInstance, stateOf, targetOf, tickFsm } from '@engine/state/fsm/fsmRuntime';
import { clear, has, insert, remove, rowOf } from '@engine/tables/tableOps';
import { length } from '@shared/math/vec2';
import { HitLanded, Landed, RigBodiesMoved } from '../../../messages/brawlMessages';
import { MoveRefused, MoveStarted, RevCancelled } from '../../../messages/moveMessages';
import { RigReady, RigSpinChanged } from '../../../messages/rigMessages';
import { RoundStarted } from '../../../messages/roundMessages';
import { SpinnerCommandIssued } from '../../../messages/spinnerMessages';
import { RevChanged, ShatterReady } from '../../../messages/styleMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { isActive, watchFlow } from '../../../shared/flowWatch';
import { rigOfSpinner } from '../../../shared/ids';
import { resolveMove, type MoveContext } from '../rules/resolveMove';
import type { MovesState } from '../state/movesState';

const buttons = ['dash', 'pop', 'whirl', 'hook'] as const;

/**
 * The move layer: button presses → the context move table → a move state in the per-Rig
 * moveFlow FSM, plus cooldowns. Hits, landings and timers move the FSM on from there
 * (e.g. dashRevUp → dash → dashRecover). Entering any state that has tuning publishes
 * MoveStarted, aimed with the Rig's latest stick. A press while committed is refused
 * (MoveRefused), unless it's a recovery or stun and the Rig pays Rev for it (RevCancelled).
 */
export function moveHandlers(state: MovesState, ctx: DomainContext): HandlerDef[] {
  const tuning = () => ctx.data.moves.moveTuning;
  const cooldownKey = (rigId: number, moveIndex: number) => rigId * state.moveNames.length + moveIndex;
  const ready: Record<string, number> = {};
  const context: MoveContext = { button: '', state: '', locked: 0, airborne: 0, spinRatio: 0, shatterReady: 0, rank: 0, ready };
  const noColumns = () => 0;

  /** Moves the Rig's FSM along `event` (e.g. "landed", "stunned") if its current state has that edge. */
  const fireEvent = (rigId: number, event: string) => {
    if (!event) return;
    const to = targetOf(state.moveFlow, rigId, event);
    if (to !== undefined) enterState(state.moveFlow, rigId, to);
  };

  const startMove = (rigId: number, move: string) => {
    const row = rowOf(state.rigs, rigId);
    state.rigs.cols.pressAimX[row] = state.rigs.cols.aimX[row];
    state.rigs.cols.pressAimY[row] = state.rigs.cols.aimY[row];
    state.rigs.cols.pressedMove[row] = move;
    enterState(state.moveFlow, rigId, move);
    const moveIndex = state.moveNames.indexOf(move);
    const spec = tuning().moves[move];
    if (moveIndex !== -1 && spec && spec.cooldownSeconds > 0) insert(state.cooldowns, cooldownKey(rigId, moveIndex), { timeLeft: spec.cooldownSeconds });
  };

  /**
   * The FSM entered `move`: if it was pressed (or is a chained move a timer starts), tell the
   * other domains, aimed where the stick points now. Falling back into `pop` after an air move
   * is not a new Pop.
   */
  const publishMoveStarted = (rigId: number, move: string) => {
    const spec = tuning().moves[move];
    const row = rowOf(state.rigs, rigId);
    if (!spec || row === -1) return;
    const pressed = state.rigs.cols.pressedMove[row] === move;
    state.rigs.cols.pressedMove[row] = '';
    if (!pressed && !tuning().chainedMoves.includes(move)) return;
    const m = state.rigs.cols;
    const aimX = spec.aimAtPress ? m.pressAimX[row] : m.aimX[row];
    const aimY = spec.aimAtPress ? m.pressAimY[row] : m.aimY[row];
    const aim = length(aimX, aimY);
    ctx.publish(MoveStarted, { rigId, move, dirX: aim > 0 ? aimX / aim : 0, dirY: aim > 0 ? aimY / aim : 0 });
  };

  const fillContext = (rigId: number, button: string): MoveContext => {
    const row = rowOf(state.rigs, rigId);
    const current = stateOf(state.moveFlow, rigId) ?? '';
    context.button = button;
    context.state = current;
    context.locked = tuning().lockedStates.includes(current) ? 1 : 0;
    context.airborne = row === -1 ? 0 : state.rigs.cols.airborne[row];
    context.spinRatio = row === -1 ? 0 : state.rigs.cols.spinRatio[row];
    context.shatterReady = row === -1 ? 0 : state.rigs.cols.shatterReady[row];
    context.rank = row === -1 ? 0 : state.rigs.cols.rank[row];
    state.moveNames.forEach((name, index) => {
      ready[name] = has(state.cooldowns, cooldownKey(rigId, index)) ? 0 : 1;
    });
    return context;
  };

  /**
   * Rev Cancel (the Dash + Whirl chord while recovering or stunned): spend Rev Ranks to drop
   * straight back to neutral, free to act. True if it happened. `context` holds the chord's context.
   */
  const revCancel = (rigId: number, row: number): boolean => {
    const rule = tuning().revCancel;
    const fromState = context.state;
    if (!rule.states.includes(fromState) || state.rigs.cols.rank[row] < rule.rankCost) return false;
    state.rigs.cols.rank[row] -= rule.rankCost;
    ctx.publish(RevCancelled, { rigId, fromState, move: rule.to });
    enterState(state.moveFlow, rigId, rule.to);
    return true;
  };

  const applyCommand = on(SpinnerCommandIssued, 'moves.applyCommand', (batch) => {
    if (!isActive(state.flow, ctx.data.flow.activity.commands)) return;
    const refs = tuning().timings;
    for (let i = 0; i < batch.count; i++) {
      const rigId = rigOfSpinner(batch.cols.spinnerId[i]);
      if (!has(state.rigs, rigId)) continue;
      const pressed = { dash: batch.cols.dash[i], pop: batch.cols.pop[i], whirl: batch.cols.whirl[i], hook: batch.cols.hook[i] };
      // Dash + Whirl pressed together (within comboWindowSeconds) is the "combo" chord: the Shatter,
      // or a Rev Cancel while recovering or stunned.
      const row = rowOf(state.rigs, rigId);
      const m = state.rigs.cols;
      // An explicit aim (a dragged button) wins over the steer, and re-aims a move that snapshots
      // its direction at the press (the Hook), so dragging during the wind-up still lands.
      const aimed = length(batch.cols.aimX[i], batch.cols.aimY[i]) > 0;
      m.aimX[row] = aimed ? batch.cols.aimX[i] : batch.cols.steerX[i];
      m.aimY[row] = aimed ? batch.cols.aimY[i] : batch.cols.steerY[i];
      if (aimed) {
        m.pressAimX[row] = batch.cols.aimX[i];
        m.pressAimY[row] = batch.cols.aimY[i];
      }
      if (pressed.dash === 1) m.dashPressedAt[row] = state.clock;
      if (pressed.whirl === 1) m.whirlPressedAt[row] = state.clock;
      const window = tuning().comboWindowSeconds ?? 0;
      const together =
        (pressed.dash === 1 || pressed.whirl === 1) &&
        m.dashPressedAt[row] > 0 &&
        m.whirlPressedAt[row] > 0 &&
        Math.abs(m.dashPressedAt[row] - m.whirlPressedAt[row]) <= window;
      if (together) {
        const combo = resolveMove(ctx.data.moves.moveTable, fillContext(rigId, 'combo'), refs);
        if (combo !== undefined || revCancel(rigId, row)) {
          m.dashPressedAt[row] = 0;
          m.whirlPressedAt[row] = 0;
          if (combo !== undefined) startMove(rigId, combo);
          continue;
        }
      }
      for (const button of buttons) {
        if (pressed[button] !== 1) continue;
        const move = resolveMove(ctx.data.moves.moveTable, fillContext(rigId, button), refs);
        if (move !== undefined) startMove(rigId, move);
        else if (context.locked === 1) ctx.publish(MoveRefused, { rigId, button });
      }
    }
  });

  const tickMoves = on(StepTicked, 'moves.tickMoves', (batch) => {
    if (!isActive(state.flow, ctx.data.flow.activity.simulation)) return;
    const dt = batch.cols.dt[batch.count - 1];
    state.clock += dt;
    tickFsm(state.moveFlow, dt);
    for (let row = state.cooldowns.count - 1; row >= 0; row--) {
      state.cooldowns.cols.timeLeft[row] -= dt;
      if (state.cooldowns.cols.timeLeft[row] <= 0) remove(state.cooldowns, state.cooldowns.ids[row]);
    }
    for (let row = 0; row < state.rigs.count; row++) evaluateGuards(state.moveFlow, state.rigs.ids[row], noColumns, tuning().timings);
  });

  return [
    applyCommand,
    tickMoves,
    on(RigReady, 'moves.onRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.rigs, batch.cols.rigId[i]);
    }),
    on(RoundStarted, 'moves.onRoundStarted', () => {
      clear(state.cooldowns);
      for (let row = 0; row < state.rigs.count; row++) startInstance(state.moveFlow, state.rigs.ids[row]);
    }),
    on(RigBodiesMoved, 'moves.observeBodies', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (has(state.rigs, batch.cols.rigId[i])) insert(state.rigs, batch.cols.rigId[i], { airborne: batch.cols.airborne[i] });
      }
    }),
    on(ShatterReady, 'moves.observeShatterReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (has(state.rigs, batch.cols.rigId[i])) insert(state.rigs, batch.cols.rigId[i], { shatterReady: batch.cols.ready[i] });
      }
    }),
    on(RevChanged, 'moves.observeRev', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (has(state.rigs, batch.cols.rigId[i])) insert(state.rigs, batch.cols.rigId[i], { rank: batch.cols.rank[i] });
      }
    }),
    on(RigSpinChanged, 'moves.observeSpin', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (has(state.rigs, batch.cols.rigId[i])) insert(state.rigs, batch.cols.rigId[i], { spinRatio: batch.cols.spinRatio[i] });
      }
    }),
    // hits.json names the moveFlow event each side of a hit receives ("stunned", "launched", …).
    on(HitLanded, 'moves.onHitLanded', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const spec = ctx.data.brawl.hits[batch.cols.hit[i]];
        if (!spec) continue;
        fireEvent(batch.cols.defenderId[i], spec.defenderEvent ?? '');
        fireEvent(batch.cols.attackerId[i], spec.attackerEvent ?? '');
      }
    }),
    on(Landed, 'moves.onLanded', (batch) => {
      for (let i = 0; i < batch.count; i++) fireEvent(batch.cols.rigId[i], 'landed');
    }),
    on(StateEntered, 'moves.onFlowState', (batch) => {
      watchFlow(state.flow, batch);
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.fsm[i] === tuning().fsm) publishMoveStarted(batch.cols.instance[i], batch.cols.state[i]);
      }
    }),
  ];
}
