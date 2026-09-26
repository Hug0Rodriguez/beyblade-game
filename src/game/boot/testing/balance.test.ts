import { it } from 'vitest';
import { ridesRimLine } from '../../domains/dish';
import type { GameData } from '../../gameData/gameData';
import { cloneGameData, loadGameData } from '../../gameData/loadGameData';
import { selectedDish } from '../../shared/dataLookups';
import { createTestWorld, type SentRow, type TestWorld } from './createTestWorld';
import { bootToMatch } from './playMatch';

/**
 * Balance report card: CPU vs CPU Matches over several seeds. Every metric has a target from
 * the design docs (moveset-triangle §10, core-loop §5, gameplay/04 §2) and prints PASS or FAIL.
 * Opt-in (slow): `npm run balance`.
 */

type Profile = Record<string, number | string>;
const SEEDS = Array.from({ length: Number(process.env.BALANCE_MATCHES ?? 64) }, (_, i) => i + 1);
const MAX_STEPS = 120 * 600;
const readHits = ['deflect', 'interrupt', 'sling', 'spike', 'outOfTheAir', 'punish'];
const dashHits = ['strike', 'airStrike', 'outOfTheAir', 'interrupt'];
const triangle: Record<string, string> = { dashRevUp: 'DASH', airDash: 'DASH', whirl: 'WHIRL', airWhirl: 'WHIRL', hookReach: 'HOOK', airHook: 'HOOK' };

interface RoundSample {
  rank: [number, number];
  spin: [number, number];
}

interface RoundRecord {
  loser: number;
  finish: string;
  seconds: number;
  zenithFirst: number;
  midRankLeader: number;
  midSpinBehind: number;
  minSpin: [number, number];
  peakRank: [number, number];
  firstHitter: number;
}

interface MatchRecord {
  winner: number;
  seconds: number;
  rounds: RoundRecord[];
  counts: Record<string, number>;
  dashGears: number[];
  triangleUse: Record<string, number>;
  longestJuggle: number;
  rimSteps: number;
  groundSteps: number;
}

/** Reads only the rows sent since the last call, per message type. */
function cursor(world: TestWorld) {
  const seen = new Map<string, number>();
  return (type: string): SentRow[] => {
    const rows = world.rows(type);
    const from = seen.get(type) ?? 0;
    seen.set(type, rows.length);
    return rows.slice(from);
  };
}

function playMatch(data: GameData, seed: number): MatchRecord {
  const world = createTestWorld({ data, seed });
  bootToMatch(world);
  const fresh = cursor(world);
  const dish = selectedDish(data);
  const shatterRank = data.style.revRanks.shatterRank;
  const record: MatchRecord = {
    winner: -1, seconds: 0, rounds: [], counts: {}, dashGears: [0, 0, 0, 0],
    triangleUse: { DASH: 0, WHIRL: 0, HOOK: 0 }, longestJuggle: 0, rimSteps: 0, groundSteps: 0,
  };
  const count = (key: string, n = 1) => (record.counts[key] = (record.counts[key] ?? 0) + n);
  const rank: [number, number] = [0, 0];
  const spin: [number, number] = [1, 1];
  const airborne = [0, 0];
  const juggle = [0, 0];
  const bodies = new Map<number, SentRow>();
  let samples: RoundSample[] = [];
  let brawling = false;
  let zenithFirst = -1;
  let firstHitter = -1;
  let minSpin: [number, number] = [1, 1];
  let peakRank: [number, number] = [0, 0];

  let steps = 0;
  for (; steps < MAX_STEPS && world.rows('MatchWon').length === 0; steps++) {
    world.step();
    for (const row of fresh('StateEntered')) {
      if (row.fsm === 'gameFlow') brawling = row.state === 'brawl';
      if (row.fsm === 'moveFlow' && triangle[row.state as string]) record.triangleUse[triangle[row.state as string]]++;
    }
    for (const row of fresh('RevChanged')) {
      const id = row.rigId as number;
      rank[id] = row.rank as number;
      peakRank[id] = Math.max(peakRank[id], rank[id]);
      if (brawling && zenithFirst === -1 && rank[id] >= shatterRank) zenithFirst = id;
    }
    for (const row of fresh('RigSpinChanged')) {
      const id = row.rigId as number;
      spin[id] = row.spinRatio as number;
      minSpin[id] = Math.min(minSpin[id], spin[id]);
    }
    for (const row of fresh('RigBodiesMoved')) {
      bodies.set(row.rigId as number, row);
      airborne[row.rigId as number] = row.airborne as number;
    }
    for (const row of fresh('Landed')) juggle[row.rigId as number] = 0;
    for (const row of fresh('HitLanded')) {
      const hit = row.hit as string;
      const defender = row.defenderId as number;
      count(`hit:${hit}`);
      if (firstHitter === -1) firstHitter = row.attackerId as number;
      if (readHits.includes(hit)) count('readsWon');
      if (dashHits.includes(hit)) record.dashGears[row.gear as number]++;
      if (airborne[defender] === 1) {
        juggle[defender]++;
        record.longestJuggle = Math.max(record.longestJuggle, juggle[defender]);
      }
    }
    for (const row of fresh('ShatterReady')) if (row.ready === 1) count('shatterReady');
    for (const row of fresh('MoveStarted')) {
      const move = row.move as string;
      if (move === 'shatter') count('shatterAttempts');
      if (move === 'breakOut') count('breakOutSpin');
      if (move === 'revBreakOut') count('breakOutRev');
    }
    for (const row of fresh('AttackWhiffed')) if (row.move === 'shatter') count('shatterWhiffs');
    count('revCancels', fresh('RevCancelled').length);

    if (brawling) {
      samples.push({ rank: [rank[0], rank[1]], spin: [spin[0], spin[1]] });
      for (const [, body] of bodies) {
        if (body.airborne === 1) continue;
        record.groundSteps++;
        if (ridesRimLine(dish, body.x as number, body.y as number, body.vx as number, body.vy as number)) record.rimSteps++;
      }
    }
    for (const row of fresh('RoundFinished')) {
      const mid = samples[Math.floor(samples.length / 2)] ?? { rank: [0, 0], spin: [1, 1] };
      record.rounds.push({
        loser: row.loserRigId as number,
        finish: row.finish as string,
        seconds: samples.length / 120,
        zenithFirst,
        midRankLeader: mid.rank[0] === mid.rank[1] ? -1 : mid.rank[0] > mid.rank[1] ? 0 : 1,
        midSpinBehind: Math.abs(mid.spin[0] - mid.spin[1]) < 0.05 ? -1 : mid.spin[0] < mid.spin[1] ? 0 : 1,
        minSpin,
        peakRank,
        firstHitter,
      });
      samples = [];
      zenithFirst = -1;
      firstHitter = -1;
      minSpin = [1, 1];
      peakRank = [rank[0], rank[1]];
    }
  }
  record.winner = (world.rows('MatchWon')[0]?.spinnerId as number) ?? -1;
  record.seconds = steps / 120;
  return record;
}

/** Both Spinners CPU: slot 0 uses `profile0` (a copy of the brawler with overrides), slot 1 the brawler. */
function matchData(profile0?: Profile): GameData {
  const data = cloneGameData(loadGameData());
  const profiles = data.spinner.cpuProfiles as unknown as Profile[];
  const spinners = data.spinner.spinners as unknown as { controller: string; profileId: string }[];
  spinners[0].controller = 'cpu';
  spinners[0].profileId = spinners[1].profileId;
  if (profile0) {
    profiles.push({ ...profiles[0], ...profile0 });
    spinners[0].profileId = profile0.id as string;
  }
  return data;
}

const pct = (n: number, of: number) => (of > 0 ? n / of : 0);
const fmt = (ratio: number) => `${(ratio * 100).toFixed(0)}%`;
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

it.skipIf(!process.env.BALANCE)('balance report card', { timeout: 900_000 }, () => {
  const mirror = SEEDS.map((seed) => playMatch(matchData(), seed));
  const dasher = SEEDS.map((seed) => playMatch(matchData({ id: 'dasher', readChance: 0, hookChance: 0, baitChance: 0, strikeChance: 1, strikeCooldown: 0.3, buildChance: 0 }), seed));
  const novice = SEEDS.map((seed) =>
    playMatch(matchData({ id: 'novice', readChance: 0.1, punishChance: 0.2, buildChance: 0.1, hookChance: 0.2, baitChance: 0.05, revCancelChance: 0.1, decisionSeconds: 0.25 }), seed),
  );

  const rounds = mirror.flatMap((m) => m.rounds);
  const matches = mirror.length;
  const sum = (key: string) => mirror.reduce((total, m) => total + (m.counts[key] ?? 0), 0);
  const winnerOf = (r: RoundRecord) => 1 - r.loser;
  const decided = (pick: (r: RoundRecord) => number) => rounds.filter((r) => pick(r) !== -1);
  const finishes = (name: string) => pct(rounds.filter((r) => r.finish === name).length, rounds.length);
  const triangleUse = mirror.reduce((acc, m) => {
    for (const [k, v] of Object.entries(m.triangleUse)) acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {} as Record<string, number>);
  const presses = Object.values(triangleUse).reduce((a, b) => a + b, 0);
  const dashGears = mirror.reduce((acc, m) => acc.map((n, i) => n + m.dashGears[i]), [0, 0, 0, 0]);
  const dashTotal = dashGears.reduce((a, b) => a + b, 0);
  const zenithRounds = decided((r) => r.zenithFirst);
  const rankRounds = decided((r) => r.midRankLeader);
  const spinRounds = decided((r) => r.midSpinBehind);
  const hitRounds = decided((r) => r.firstHitter);
  const breakOuts = sum('breakOutSpin') + sum('breakOutRev');
  const noviceRounds = novice.flatMap((m) => m.rounds);

  type Line = [group: string, metric: string, value: string, target: string, pass: boolean];
  const lines: Line[] = [
    ['Pace', 'Round length (median)', `${median(rounds.map((r) => r.seconds)).toFixed(1)} s`, '20–40 s', ((m) => m >= 20 && m <= 40)(median(rounds.map((r) => r.seconds)))],
    ['Pace', 'Match length (mean · longest)', `${(mirror.reduce((t, m) => t + m.seconds, 0) / matches).toFixed(0)} s · ${Math.max(...mirror.map((m) => m.seconds)).toFixed(0)} s`, 'mean ≤ 180 s', mirror.reduce((t, m) => t + m.seconds, 0) / matches <= 180],
    ['Finishes', 'Topple share', fmt(finishes('topple')), '≤ 35%', finishes('topple') <= 0.35],
    ['Finishes', 'Spill / Shatter share', `${fmt(finishes('spill'))} / ${fmt(finishes('shatter'))}`, 'info', true],
    ['Triangle', 'DASH · WHIRL · HOOK', Object.entries(triangleUse).map(([k, n]) => `${k} ${(pct(n, presses) * 100).toFixed(1)}%`).join(' · '), 'each 20–40%', Object.values(triangleUse).every((n) => pct(n, presses) >= 0.2 && pct(n, presses) <= 0.4)],
    ['Triangle', 'Always-Dash CPU wins', fmt(pct(dasher.filter((m) => m.winner === 0).length, dasher.length)), '≤ 60%', pct(dasher.filter((m) => m.winner === 0).length, dasher.length) <= 0.6],
    ['Reads', 'Reads won per Round', (sum('readsWon') / rounds.length).toFixed(2), '≥ 1', sum('readsWon') / rounds.length >= 1],
    ['Reads', 'Punishes per Round', (sum('hit:punish') / rounds.length).toFixed(2), '≥ 0.5', sum('hit:punish') / rounds.length >= 0.5],
    ['Gears', 'Dash hits at Gear 2+', fmt(pct(dashGears[2] + dashGears[3], dashTotal)), '≥ 35%', pct(dashGears[2] + dashGears[3], dashTotal) >= 0.35],
    ['Gears', 'Time on the Rim Line', fmt(pct(mirror.reduce((t, m) => t + m.rimSteps, 0), mirror.reduce((t, m) => t + m.groundSteps, 0))), '≤ 50%', pct(mirror.reduce((t, m) => t + m.rimSteps, 0), mirror.reduce((t, m) => t + m.groundSteps, 0)) <= 0.5],
    ['Snowball', 'First to ZENITH wins the Round', fmt(pct(zenithRounds.filter((r) => r.zenithFirst === winnerOf(r)).length, zenithRounds.length)), '≤ 70%', pct(zenithRounds.filter((r) => r.zenithFirst === winnerOf(r)).length, zenithRounds.length) <= 0.7],
    ['Snowball', 'Rank leader at midpoint wins', fmt(pct(rankRounds.filter((r) => r.midRankLeader === winnerOf(r)).length, rankRounds.length)), '≤ 70%', pct(rankRounds.filter((r) => r.midRankLeader === winnerOf(r)).length, rankRounds.length) <= 0.7],
    ['Snowball', 'First hit wins the Round', fmt(pct(hitRounds.filter((r) => r.firstHitter === winnerOf(r)).length, hitRounds.length)), '≤ 75%', pct(hitRounds.filter((r) => r.firstHitter === winnerOf(r)).length, hitRounds.length) <= 0.75],
    ['Comeback', 'Won after dipping below 40% Spin', fmt(pct(rounds.filter((r) => r.minSpin[winnerOf(r)] < 0.4).length, rounds.length)), '≥ 25%', pct(rounds.filter((r) => r.minSpin[winnerOf(r)] < 0.4).length, rounds.length) >= 0.25],
    ['Comeback', 'Behind on Spin at midpoint wins', fmt(pct(spinRounds.filter((r) => r.midSpinBehind === winnerOf(r)).length, spinRounds.length)), '25–50%', ((p) => p >= 0.25 && p <= 0.5)(pct(spinRounds.filter((r) => r.midSpinBehind === winnerOf(r)).length, spinRounds.length))],
    ['Shatter', 'Ready windows / attempts per Match', `${(sum('shatterReady') / matches).toFixed(2)} / ${(sum('shatterAttempts') / matches).toFixed(2)}`, 'info', true],
    ['Shatter', 'Landed per Match', (sum('hit:shatter') / matches).toFixed(2), '≥ 1', sum('hit:shatter') / matches >= 1],
    ['Shatter', 'Whiff rate', fmt(pct(sum('shatterWhiffs'), sum('shatterAttempts'))), '≤ 35%', pct(sum('shatterWhiffs'), sum('shatterAttempts')) <= 0.35],
    ['Rev', 'Rev spends per Round (cancel + break)', `${((sum('revCancels') + sum('breakOutRev')) / rounds.length).toFixed(2)} (cancel ${sum('revCancels')}, break ${sum('breakOutRev')})`, '≥ 0.5', (sum('revCancels') + sum('breakOutRev')) / rounds.length >= 0.5],
    ['Juggles', 'Longest juggle', `${Math.max(...mirror.map((m) => m.longestJuggle))} hits`, '≤ 6', Math.max(...mirror.map((m) => m.longestJuggle)) <= 6],
    ['Juggles', 'Break Outs per Match (Rev-paid share)', `${(breakOuts / matches).toFixed(2)} (${fmt(pct(sum('breakOutRev'), breakOuts))})`, '> 0', breakOuts > 0],
    ['Novice', 'Novice CPU median peak Rank', `${median(noviceRounds.map((r) => r.peakRank[0]))}`, '≥ 2 (Spinning)', median(noviceRounds.map((r) => r.peakRank[0])) >= 2],
    ['Fairness', 'Match wins slot 0 · slot 1', `${mirror.filter((m) => m.winner === 0).length} · ${mirror.filter((m) => m.winner === 1).length}`, 'info', true],
  ];

  const widths = [9, 38, 34, 14];
  const pad = (text: string, width: number) => text.padEnd(width);
  console.log(`\nBALANCE REPORT CARD · ${matches} Matches · ${rounds.length} Rounds (CPU vs CPU)\n`);
  for (const [group, metric, value, target, pass] of lines) {
    const verdict = target === 'info' ? '' : pass ? 'PASS' : 'FAIL';
    console.log(`${pad(group, widths[0])}${pad(metric, widths[1])}${pad(value, widths[2])}${pad(target, widths[3])}${verdict}`);
  }
  const failed = lines.filter(([, , , target, pass]) => target !== 'info' && !pass).length;
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAIL`}`);
});
