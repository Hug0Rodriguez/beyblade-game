import { StateEntered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { insert } from '@engine/tables/tableOps';
import { MatchStarted, RematchRequested, StartRequested } from '../../../messages/flowMessages';
import { MatchWon, PointsAwarded, RoundScored } from '../../../messages/matchMessages';
import { RoundFinished } from '../../../messages/roundMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { spinnerOfRig } from '../../../shared/ids';
import { matchWinner } from '../rules/matchWinner';
import type { MatchState } from '../state/matchState';

/** Points: awarded to everyone but the Round's loser; first to the target wins the Match. */
export function matchHandlers(state: MatchState, ctx: DomainContext): HandlerDef[] {
  const p = state.points.cols;

  const startMatch = () => {
    for (let row = 0; row < state.points.count; row++) {
      p.points[row] = 0;
      ctx.publish(PointsAwarded, { spinnerId: state.points.ids[row], points: 0, total: 0 });
    }
    ctx.publish(MatchStarted, {});
  };

  return [
    on(SpinnerAssigned, 'match.onSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.points, batch.cols.spinnerId[i], { name: batch.cols.name[i] });
    }),
    on(StartRequested, 'match.onStartRequested', startMatch),
    on(RematchRequested, 'match.onRematchRequested', startMatch),
    on(RoundFinished, 'match.awardPoints', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const loser = spinnerOfRig(batch.cols.loserRigId[i]);
        for (let row = 0; row < state.points.count; row++) {
          if (state.points.ids[row] === loser) continue;
          p.points[row] += batch.cols.points[i];
          ctx.publish(PointsAwarded, { spinnerId: state.points.ids[row], points: batch.cols.points[i], total: p.points[row] });
        }
      }
    }),
    on(StateEntered, 'match.onRoundSettled', (batch) => {
      const settle = ctx.data.match.matchRules.settleWhen;
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.fsm[i] !== settle.fsm || batch.cols.state[i] !== settle.state) continue;
        const winner = matchWinner(state, ctx.data);
        if (winner === -1) ctx.publish(RoundScored, {});
        else ctx.publish(MatchWon, { spinnerId: state.points.ids[winner], name: p.name[winner] });
      }
    }),
  ];
}
