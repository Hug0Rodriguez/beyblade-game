import { StateEntered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { insert } from '@engine/tables/tableOps';
import { GearChanged, RigBodiesMoved } from '../../../messages/brawlMessages';
import { RigSpinChanged } from '../../../messages/rigMessages';
import { RevChanged, ShatterReady } from '../../../messages/styleMessages';
import type { DomainContext } from '../../../shared/domainContext';
import type { SpinnerState } from '../state/spinnerState';

/** The Spinner domain's own copy of what it needs to know about every Rig. */
export function observeHandlers(state: SpinnerState, ctx: DomainContext): HandlerDef[] {
  return [
    on(RigBodiesMoved, 'spinner.observeBodies', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        insert(state.observedRigs, batch.cols.rigId[i], {
          x: batch.cols.x[i],
          y: batch.cols.y[i],
          z: batch.cols.z[i],
          vx: batch.cols.vx[i],
          vy: batch.cols.vy[i],
          airborne: batch.cols.airborne[i],
        });
      }
    }),
    on(RigSpinChanged, 'spinner.observeSpin', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.observedRigs, batch.cols.rigId[i], { spinRatio: batch.cols.spinRatio[i] });
    }),
    on(ShatterReady, 'spinner.observeShatterReady', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.observedRigs, batch.cols.rigId[i], { shatterReady: batch.cols.ready[i] });
    }),
    on(RevChanged, 'spinner.observeRev', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.observedRigs, batch.cols.rigId[i], { rank: batch.cols.rank[i] });
    }),
    on(GearChanged, 'spinner.observeGear', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.observedRigs, batch.cols.rigId[i], { gear: batch.cols.gear[i] });
    }),
    on(StateEntered, 'spinner.observeMoves', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.fsm[i] === ctx.data.moves.moveTuning.fsm) insert(state.observedRigs, batch.cols.instance[i], { move: batch.cols.state[i] });
      }
    }),
  ];
}
