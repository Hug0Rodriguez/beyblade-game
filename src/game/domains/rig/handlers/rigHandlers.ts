import { StateEntered, StepTicked } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { clear, has, insert, remove, rowOf } from '@engine/tables/tableOps';
import { HitLanded } from '../../../messages/brawlMessages';
import { MoveStarted } from '../../../messages/moveMessages';
import { RigReady, RigSpinChanged } from '../../../messages/rigMessages';
import { RoundStarted } from '../../../messages/roundMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import { RevChanged } from '../../../messages/styleMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { isActive, watchFlow } from '../../../shared/flowWatch';
import { rigOfSpinner } from '../../../shared/ids';
import { rigDefinition } from '../../../shared/dataLookups';
import type { RigState } from '../state/rigState';

/** Rigs and their Spin (life): full at every drop-in, drained by time and by hits. */
export function rigHandlers(state: RigState, ctx: DomainContext): HandlerDef[] {
  const r = state.rigs.cols;
  const publishSpin = (row: number) =>
    ctx.publish(RigSpinChanged, { rigId: state.rigs.ids[row], spin: r.spin[row], spinRatio: r.spin[row] / r.maxSpin[row] });

  return [
    on(SpinnerAssigned, 'rig.onSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const spinnerId = batch.cols.spinnerId[i];
        const rigId = rigOfSpinner(spinnerId);
        const def = rigDefinition(ctx.data, batch.cols.rigId[i]);
        insert(state.rigs, rigId, { spinnerId, maxSpin: def.maxSpin, spin: def.maxSpin });
        ctx.publish(RigReady, {
          rigId,
          spinnerId,
          slot: batch.cols.slot[i],
          name: def.name,
          color: def.color,
          accentColor: def.accentColor,
          radius: def.radius,
          weight: def.weight,
          baseSpeed: def.baseSpeed,
          maxSpin: def.maxSpin,
          blades: def.blades,
        });
      }
    }),
    on(RoundStarted, 'rig.onRoundStarted', () => {
      clear(state.sustained);
      for (let row = 0; row < state.rigs.count; row++) {
        r.spin[row] = r.maxSpin[row];
        publishSpin(row);
      }
    }),
    on(StepTicked, 'rig.tickSpin', (batch) => {
      if (!isActive(state.flow, ctx.data.flow.activity.brawling)) return;
      const decay = ctx.data.rig.rigRules.spinDecayPerSecond * batch.cols.dt[batch.count - 1];
      for (let row = 0; row < state.rigs.count; row++) {
        if (r.spin[row] <= 0 || has(state.sustained, state.rigs.ids[row])) continue;
        r.spin[row] = Math.max(0, r.spin[row] - decay);
        publishSpin(row);
      }
    }),
    on(HitLanded, 'rig.onHitLanded', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const row = rowOf(state.rigs, batch.cols.defenderId[i]);
        if (row === -1) continue;
        r.spin[row] = Math.max(0, r.spin[row] - batch.cols.damage[i]);
        publishSpin(row);
      }
    }),
    on(MoveStarted, 'rig.onMoveStarted', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const cost = ctx.data.moves.moveTuning.moves[batch.cols.move[i]]?.spinCostRatio ?? 0;
        const row = rowOf(state.rigs, batch.cols.rigId[i]);
        if (cost <= 0 || row === -1) continue;
        r.spin[row] = Math.max(0, r.spin[row] - cost * r.maxSpin[row]);
        publishSpin(row);
      }
    }),
    on(RevChanged, 'rig.onRevChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.sustaining[i] === 1) insert(state.sustained, batch.cols.rigId[i]);
        else remove(state.sustained, batch.cols.rigId[i]);
      }
    }),
    on(StateEntered, 'rig.onFlowState', (batch) => void watchFlow(state.flow, batch)),
  ];
}
