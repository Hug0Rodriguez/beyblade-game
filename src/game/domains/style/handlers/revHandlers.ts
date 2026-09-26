import { StateEntered, StepTicked } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { insert, rowOf } from '@engine/tables/tableOps';
import { AttackWhiffed, HitLanded, RigBodiesMoved } from '../../../messages/brawlMessages';
import { MoveStarted, RevCancelled } from '../../../messages/moveMessages';
import { RigReady, RigSpinChanged } from '../../../messages/rigMessages';
import { RoundFinished, RoundStarted } from '../../../messages/roundMessages';
import { RedlineChanged, RevChanged, RevGained, ShatterCharging, ShatterReady } from '../../../messages/styleMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { isActive, watchFlow } from '../../../shared/flowWatch';
import { dropRanks, progressOf, rankOf, varietyFactor } from '../rules/revRank';
import type { StyleState } from '../state/styleState';

const windowColumns = ['h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'] as const;

/**
 * Rev Rank: landed hits earn Rev (winning a read earns most, repeats earn less), getting hit
 * costs a share of it (more when you lost a read), idling bleeds it. The Rank multiplies damage,
 * sustains Spin from Cyclone up, and is **spent**: a Rank per Rev Cancel or Rev Break, all of it
 * on the Shatter. In Redline (low Spin) gains are boosted and passive losses are floored.
 */
export function revHandlers(state: StyleState, ctx: DomainContext): HandlerDef[] {
  const r = state.rev.cols;
  const style = () => ctx.data.style;
  const recent: string[] = [];

  const windowOf = (row: number): string[] => {
    recent.length = 0;
    const size = Math.min(style().revRules.varietyWindow, windowColumns.length);
    for (let i = 0; i < size; i++) {
      const entry = r[windowColumns[i]][row];
      if (entry) recent.push(entry);
    }
    return recent;
  };

  const remember = (row: number, hit: string) => {
    const size = Math.min(style().revRules.varietyWindow, windowColumns.length);
    if (size <= 0) return;
    r[windowColumns[r.cursor[row] % size]][row] = hit;
    r.cursor[row] = (r.cursor[row] + 1) % size;
  };

  const publishRev = (row: number) => {
    const { ranks, maxPoints, sustainFromRank } = style().revRanks;
    const rank = rankOf(ranks, r.points[row]);
    r.publishedPoints[row] = r.points[row];
    ctx.publish(RevChanged, {
      rigId: state.rev.ids[row],
      points: r.points[row],
      rank,
      rankName: ranks[rank].name,
      color: ranks[rank].color,
      progress: progressOf(ranks, r.points[row], maxPoints),
      multiplier: ranks[rank].multiplier,
      sustaining: rank >= sustainFromRank ? 1 : 0,
    });
  };

  const addPoints = (row: number, amount: number) => {
    r.points[row] = Math.max(0, Math.min(style().revRanks.maxPoints, r.points[row] + amount));
  };

  /** Earned Rev, boosted in Redline. Returns what was added. */
  const gain = (row: number, amount: number): number => {
    const boosted = r.redline[row] === 1 ? amount * style().revRules.redline.gainMultiplier : amount;
    addPoints(row, boosted);
    return boosted;
  };

  /** A passive loss (hit, idle, whiff): in Redline it can't take you below the floor Rank. */
  const lose = (row: number, to: number) => {
    const before = r.points[row];
    let next = Math.max(0, to);
    if (r.redline[row] === 1) next = Math.max(next, Math.min(before, style().revRanks.ranks[style().revRules.redline.floorRank]?.threshold ?? 0));
    r.points[row] = next;
  };

  /** Spends Ranks (Rev Cancel, Rev Break): no floor, you chose it. */
  const spendRanks = (row: number, rigId: number, ranks: number, reason: string) => {
    const before = r.points[row];
    r.points[row] = dropRanks(style().revRanks.ranks, before, ranks);
    ctx.publish(RevGained, { rigId, reason, amount: r.points[row] - before, stale: 0 });
    publishRev(row);
    updateShatterReady();
  };

  /** Shatter readiness: own Rank held at the Shatter Rank long enough (charged) and some rival low enough on Spin. */
  const updateShatterReady = () => {
    const { ranks, shatterRank } = style().revRanks;
    for (let row = 0; row < state.rev.count; row++) {
      let lowestRival = Infinity;
      for (let other = 0; other < state.rev.count; other++) if (other !== row) lowestRival = Math.min(lowestRival, r.spinRatio[other]);
      const ready =
        !state.roundOver &&
        isActive(state.flow, ctx.data.flow.activity.brawling) &&
        rankOf(ranks, r.points[row]) >= shatterRank &&
        r.zenithTime[row] >= style().revRules.shatterChargeSeconds &&
        lowestRival < style().revRules.shatterRivalSpinRatio
          ? 1
          : 0;
      if (ready === r.shatterReady[row]) continue;
      r.shatterReady[row] = ready;
      ctx.publish(ShatterReady, { rigId: state.rev.ids[row], ready });
    }
  };

  return [
    on(RigReady, 'style.onRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.rev, batch.cols.rigId[i], { baseSpeed: batch.cols.baseSpeed[i], spinRatio: 1 });
    }),
    on(RoundFinished, 'style.onRoundFinished', () => {
      state.roundOver = true;
      updateShatterReady();
    }),
    on(RoundStarted, 'style.onRoundStarted', () => {
      state.roundOver = false;
      for (let row = 0; row < state.rev.count; row++) {
        r.points[row] = 0;
        r.idle[row] = 0;
        r.cursor[row] = 0;
        r.spinRatio[row] = 1;
        r.zenithTime[row] = 0;
        if (r.chargeShown[row] !== 0) {
          r.chargeShown[row] = 0;
          ctx.publish(ShatterCharging, { rigId: state.rev.ids[row], progress: 0 });
        }
        if (r.redline[row] === 1) {
          r.redline[row] = 0;
          ctx.publish(RedlineChanged, { rigId: state.rev.ids[row], active: 0 });
        }
        for (const column of windowColumns) r[column][row] = '';
        if (r.shatterReady[row] === 1) {
          r.shatterReady[row] = 0;
          ctx.publish(ShatterReady, { rigId: state.rev.ids[row], ready: 0 });
        }
        publishRev(row);
      }
    }),
    on(HitLanded, 'style.onHitLanded', (batch) => {
      const gains = style().revGains;
      for (let i = 0; i < batch.count; i++) {
        const hit = batch.cols.hit[i];
        const attacker = rowOf(state.rev, batch.cols.attackerId[i]);
        const defender = rowOf(state.rev, batch.cols.defenderId[i]);
        if (attacker !== -1) {
          const base = gains.hits[hit] ?? 0;
          const factor = varietyFactor(windowOf(attacker), hit, style().revRules.varietyFactors);
          remember(attacker, hit);
          if (base * factor > 0) {
            const amount = gain(attacker, base * factor);
            ctx.publish(RevGained, { rigId: batch.cols.attackerId[i], reason: hit, amount, stale: factor < 1 ? 1 : 0 });
          }
          if (batch.cols.afterRim[i] === 1 && gains.afterRimBonus > 0) {
            const amount = gain(attacker, gains.afterRimBonus);
            ctx.publish(RevGained, { rigId: batch.cols.attackerId[i], reason: 'afterRim', amount, stale: 0 });
          }
          const spend = style().revRules.spendOnHit[hit] ?? 0;
          if (spend > 0) r.points[attacker] *= 1 - spend;
          r.idle[attacker] = 0;
          publishRev(attacker);
        }
        if (defender !== -1) {
          const rules = style().revRules;
          const lossRatio = rules.lossPenaltyRatios[hit];
          const before = r.points[defender];
          let after = before * (1 - (lossRatio ?? rules.hitPenaltyRatio));
          // ZENITH is fragile: any hit knocks you off it (the rival's answer to a charging Shatter).
          if (rankOf(style().revRanks.ranks, before) >= style().revRanks.shatterRank) after = Math.min(after, dropRanks(style().revRanks.ranks, before, rules.topRankHitDrop));
          lose(defender, after);
          const lost = before - r.points[defender];
          // Losing a read always says so; a plain hit only when it actually cost something.
          if (lossRatio !== undefined || lost >= 1) {
            ctx.publish(RevGained, { rigId: batch.cols.defenderId[i], reason: lossRatio !== undefined ? 'countered' : 'hitTaken', amount: -lost, stale: 0 });
          }
          publishRev(defender);
        }
      }
      updateShatterReady();
    }),
    on(AttackWhiffed, 'style.onAttackWhiffed', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const row = rowOf(state.rev, batch.cols.rigId[i]);
        const drop = style().revRules.whiffPenaltyRanks[batch.cols.move[i]] ?? 0;
        if (row === -1 || drop <= 0) continue;
        lose(row, dropRanks(style().revRanks.ranks, r.points[row], drop));
        publishRev(row);
      }
      updateShatterReady();
    }),
    on(RigBodiesMoved, 'style.observeBodies', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const row = rowOf(state.rev, batch.cols.rigId[i]);
        if (row === -1) continue;
        r.airborne[row] = batch.cols.airborne[i];
        r.speed[row] = Math.hypot(batch.cols.vx[i], batch.cols.vy[i]);
      }
    }),
    on(RigSpinChanged, 'style.observeSpin', (batch) => {
      const line = style().revRules.redline;
      for (let i = 0; i < batch.count; i++) {
        const row = rowOf(state.rev, batch.cols.rigId[i]);
        if (row === -1) continue;
        r.spinRatio[row] = batch.cols.spinRatio[i];
        const redline = !state.roundOver && r.spinRatio[row] > 0 && r.spinRatio[row] < line.spinRatio ? 1 : 0;
        if (redline === r.redline[row]) continue;
        r.redline[row] = redline;
        ctx.publish(RedlineChanged, { rigId: batch.cols.rigId[i], active: redline });
      }
    }),
    on(RevCancelled, 'style.onRevCancelled', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const row = rowOf(state.rev, batch.cols.rigId[i]);
        if (row !== -1) spendRanks(row, batch.cols.rigId[i], ctx.data.moves.moveTuning.revCancel.rankCost, 'revCancel');
      }
    }),
    on(MoveStarted, 'style.onMoveStarted', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const cost = ctx.data.moves.moveTuning.moves[batch.cols.move[i]]?.revRankCost ?? 0;
        const row = rowOf(state.rev, batch.cols.rigId[i]);
        if (cost > 0 && row !== -1) spendRanks(row, batch.cols.rigId[i], cost, batch.cols.move[i]);
      }
    }),
    on(StepTicked, 'style.tickRev', (batch) => {
      if (!isActive(state.flow, ctx.data.flow.activity.brawling)) return;
      const dt = batch.cols.dt[batch.count - 1];
      const { revGains, revRules, revRanks } = style();
      for (let row = 0; row < state.rev.count; row++) {
        const rankBefore = rankOf(revRanks.ranks, r.points[row]);
        r.idle[row] += dt;
        if (r.idle[row] > revRules.idleGraceSeconds) lose(row, r.points[row] - revRules.idleDecayPerSecond * dt);
        if (r.airborne[row] === 1) gain(row, revGains.airtimePerSecond * dt);
        if (r.speed[row] > r.baseSpeed[row] * revGains.surplusSpeedRatio) gain(row, revGains.surplusPerSecond * dt);
        const rankNow = rankOf(revRanks.ranks, r.points[row]);
        const rankChanged = rankNow !== rankBefore;
        r.zenithTime[row] = rankNow >= revRanks.shatterRank ? r.zenithTime[row] + dt : 0;
        const charge = Math.min(1, r.zenithTime[row] / Math.max(1e-6, revRules.shatterChargeSeconds));
        if (Math.abs(charge - r.chargeShown[row]) >= 0.1 || (charge !== r.chargeShown[row] && (charge === 0 || charge === 1))) {
          r.chargeShown[row] = charge;
          ctx.publish(ShatterCharging, { rigId: state.rev.ids[row], progress: charge });
        }
        if (rankChanged || Math.abs(r.points[row] - r.publishedPoints[row]) >= 1) publishRev(row);
      }
      updateShatterReady();
    }),
    on(StateEntered, 'style.onFlowState', (batch) => {
      if (watchFlow(state.flow, batch) !== undefined) updateShatterReady();
    }),
  ];
}
