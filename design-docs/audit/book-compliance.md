# Book-compliance audit: does the battle loop follow *Game Mechanics*?

> **Why this exists.** Playtest verdict (2026-09-24): the loop "makes no sense":
> - there's no *why* to take any action
> - there are no cues
> - the combos can't be understood
> - it isn't a coherent system of feedback loops
>
> This audit checks the design rules from our sources against three layers:
> - the [gameplay docs](../gameplay/README.md)
> - the [SPINRIOT pitch](../pitches/spinriot/README.md)
> - the build (`data/game/**`, `src/game/**`)
>
> Partial compliance is where the problem lives.
>
> **The fix** is [pitches/spinriot/moveset-triangle.md](../pitches/spinriot/moveset-triangle.md).

**Sources.** Line numbers refer to the files in [resources/](../resources/):
- **GM**: `game_mechanics` (Adams & Dormans, *Game Mechanics: Advanced Game Design*)
- **GB**: `gamers_brain.md` (Hodent, *The Gamer's Brain*)
- **GF**: `1.Game Feel_…md` (Swink, *Game Feel*)

**Legend:**
- ✅ complies
- ◐ partial
- ✗ violates or missing

---

## 1. The root cause in one sentence

**No action costs anything, so no action is a decision.** The book puts it this way:

> attacking must cost a resource that could be spent elsewhere; otherwise a two-player game becomes "a race to destroy the opponent with few or no strategic choices" (GM 18733).

The build breaks this in three ways:
- **Every move is free.** Dash has only a 0.16 s cooldown.
- **A Strike refunds your speed.** You keep 92% of it (`ricochetKeep 0.92`).
- **Rev is never spent.** It's a passive ×1–3 multiplier.

In play this shows up as mashing: a hit lands every 1.2 s.

---

## 2. Rule by rule

| # | Rule from the source | Gameplay docs | SPINRIOT pitch | Build (before the fix) | What the player feels | Fixed by (moveset-triangle) |
|---|---|---|---|---|---|---|
| 1 | **Attacking must cost a resource** that could be spent elsewhere (GM 18733) | ✅ Rush costs Spin; a hit spends 65% of Velocity | ◐ Speed "spent on contact", but refunded by the ricochet | ✗ Every move is free; a Strike refunds 92% of speed | "No why, no decisions" | Commitment: tells, recovery, and a stun when you lose an exchange. Whirl steals speed. |
| 2 | **Strategy lives in the discrete layer**; physics only tests dexterity (GM 1081–1150) | ✅ Gears 0–3 and gauges | ◐ Rev Rank is discrete; Speed is continuous | ✗ Damage is `2.4 + 0.0048·speed × Rank`, hidden | Nothing to plan around | 3 moves × 3 outcomes, plus a Punish |
| 3 | **A resource needs several things to spend it on**; one option "is of little use" (GM 17750; the sand example, GM 4520) | ◐ Velocity has 3 uses; the Special Gauge 1 | ✗ Rev is never spent | ✗ A passive multiplier; the Shatter doesn't spend it | Style points pile up with no use | The Shatter spends all Rev; losing an exchange costs Rev |
| 4 | **Players must foresee the consequences** of their choices (GM 1724, 1733); their impact must be perceivable (GB 5996) | ✅ on paper: "no hidden math" | ◐ | ✗ Hit power, Whirl reach, stale moves and the Shatter gate are all invisible | "It makes no sense what anything does" | Tells before every move, plus the cue table |
| 5 | **2–4 major loops**, because "you grasp the loops… your players do not" (GM 7704–7714); loops must be readable (GM 23399) | ✗ 7 positive + 12 negative | ✗ 4 + 8 | ✗ Mostly automatic physics | "Not a coherent system" | Exactly 3 loops |
| 6 | **A loop is a closed circuit through player actions** (GM 7488–7507, 5205) | ✅ Rail → Velocity → Rail | ◐ The ricochet loop is automatic | ✗ The moves neither feed nor draw from anything | "The actions are not a loop" | Read → counter → punish → Rev → Shatter |
| 7 | **Intransitive options**: every strategy has a counter (GM 19120, Arms Race) | ✅ Rush / Guard / Parry | ◐ Strike / Launch / Deflect | ◐ Only Deflect beats Strike, in a 0.14 s window on the Launch button; nothing counters Whirl | Defence feels like luck | Dash › Hook › Whirl › Dash |
| 8 | **Orthogonal differentiation**: unique options, not stronger or weaker copies (GM 8935) | ◐ | ◐ | ✗ Dash, Whirl and Dive all just deal damage | "The moves are thrown together" | Strike / guard / throw / punish; each has one job |
| 9 | **Risk matched to reward** (GM 4402–4452) | ✅ | ◐ | ✗ A whiff costs nothing (except the Shatter) | No reason to wait for an opening | Recovery windows; losing means a stun |
| 10 | **Avoid dominant strategies**; test with scripted AI (GM 8216, 10720) | ✅ failure metrics | ✅ failure metrics | ◐ Mirror CPU only; the Dash share is unmeasured | — | Move-share and always-Dash metrics in `npm run balance` |
| 11 | **Frequent inputs, none too big** (GM 4301) | ✅ | ✅ | ◐ The ×3 multiplier and the 40-damage Shatter swing whole Rounds | Snowball Rounds | Tuning pass |
| 12 | **Signs: informative, inviting, and feedback, including *why* something failed** (GB 4851–4945) | ◐ bars listed; feedback only as juice | ◐ | ◐ Only gains get callouts | "There is no cue" | Cue table, with failure feedback |
| 13 | **Clear goals: players know *why* to care** (GB 5813–5909); "many actions, none worthwhile = a chore" (GF 7481–7527) | ✅ | ◐ | ✗ No reason to pick one move over another | "No why" | The read table: the rival's posture → your answer |
| 14 | **Players can anticipate an enemy from how it looks** (GB 7524) | ◐ Parry flash | ✗ | ✗ The CPU's Dash is instant | Reads are impossible | Rev-up, ring, reach arc, landing marker |
| 15 | **Context gives actions meaning** (GF 4036–4054, 6278) | ✅ the Xtreme Line | ◐ Lip gaps | ◐ An empty bowl; only the Lip gaps matter | Nowhere is worth going | The Hook slings the rival into the Rim or toward a Lip |

---

## 3. Where each layer went partial

- **Gameplay docs (Xtreme Velocity).** They comply on the economy: attacks cost something, there's a triangle, and the math is visible. They **break the 2–4-loops rule** with 19 loops and 6 resources, so they are too big to read.
- **SPINRIOT pitch.** It kept the juice and the style ladder but **dropped the cost side**:
  - The ricochet refunds speed.
  - Rev is never spent.
  - Launch and Deflect share a button.

  From there, it only partly complies with every economy rule.
- **Build.** It made the pitch worse in three ways:
  - hid the damage math
  - left defence as a 0.14 s window with no tell
  - gave feedback for gains only

  It also **drifted from its own doc**:

  | What | `core-loop.md` said | The data says |
  |---|---|---|
  | Hit penalty | "−2 Ranks" | 15% of Rev |
  | Shatter gate | "rival below 30%" | 60% |

  The pitch docs are now corrected to match the data.

---

## 4. Re-score after the fix (2026-09-24)

Evidence comes from the data (`data/game/**`), the headless tests (`src/game/boot/triangle.test.ts`, `style.test.ts`, `airGame.test.ts`) and `npm run balance` (8 CPU vs CPU Matches).

| # | Before | After | Evidence |
|---|---|---|---|
| 1 | ✗ | ✅ | Attacks cost **commitment** (tell → active → recovery; losing a read launches or stuns you) **and speed**. Every Dash and Hook spends the **Gear** you built: a landed Dash keeps 35% of it, a Sling stops you, and planting a Whirl throws your own away ([moveset-triangle §5](../pitches/spinriot/moveset-triangle.md#5-gears-speed-is-what-every-attack-spends)). Speed can be spent elsewhere: on a Dash, a Sling, or kept for positioning. |
| 2 | ✗ | ✅ | 3 moves × 3 outcomes, plus a Punish. Hit power is read off four Gears (`brawl/gears.json`) instead of a hidden speed formula. |
| 3 | ✗ | ✅ | Speed (Gear) is spent by Dash and Hook. **Rev has three spends, one Rank at a time:** Rev Cancel (the J+L chord out of recovery or stun), Rev Break (escape a juggle), and the charged Shatter (all of it). Every spend lowers your damage multiplier, so it's a real trade-off. Measured: 3.5 spends per Round. Evidence: `revSpend.test.ts`, the report card. (`revRules.spendOnHit`), so there's a real "cash out now or keep ×3" choice. Still one spending option, not several. |
| 4 | ✗ | ✅ | Rev-up arrow, Whirl ring, Hook reach arc (the grab only covers that arc), Dive landing marker, recovery pulse, stun stars, Shatter-gate tick on the Spin bar |
| 5 | ✗ | ✅ | 3 loops: read → counter → punish · steal · style → finish ([moveset-triangle §7](../pitches/spinriot/moveset-triangle.md#7-the-three-loops)) |
| 6 | ✗ | ✅ | Every loop runs through a button press; about **6 reads won per Round** |
| 7 | ◐ | ✅ | DASH › HOOK › WHIRL › DASH, the same in the air; tested in `triangle.test.ts` |
| 8 | ✗ | ✅ | strike / guard / throw / punish; move use is **DASH 38% · WHIRL 32% · HOOK 29%** |
| 9 | ✗ | ✅ | A whiff leaves you in recovery, which is Punishable (`vulnerableStates`) |
| 10 | ◐ | ✅ | Balance adds triangle share, reads per Round, and always-Dash vs mixed |
| 11 | ◐ | ✅ | The Rank multiplier is flattened to ×2 at most. ZENITH must charge 1.4 s, any hit knocks you off it, and a Jump dodges the Shatter. Redline lifts the trailing Rig. Measured: the Rank leader at the midpoint wins 55%; first to ZENITH wins **69%, at the 70% line**; a Rig that dipped below 40% Spin wins 48%. |
| 12 | ◐ | ✅ | Failure feedback: COUNTERED and −REV (red), STALE (grey), a red ring on a refused press |
| 13 | ✗ | ✅ | The read table ([moveset-triangle §4](../pitches/spinriot/moveset-triangle.md#4-why-the-player-presses-anything-the-read-table)) and the in-game hint "DASH › HOOK › WHIRL › DASH · DIVE punishes" |
| 14 | ✗ | ✅ | The CPU winds up visibly (rev-up, reach) and reads *your* tells with `readChance` |
| 15 | ◐ | ✅ | The **Rim Line** is a place worth going: it builds Gear, and it's visible and near the edge. The Hook also slings rivals into the Rim (WALL SPLAT) or out through a Lip. |

**Addressed in the second pass (Gears):**
- **Round length:** 21.9 s, inside the 20–40 s target. Attacks now spend speed, hits are weaker at low Gear, Rigs have 150 Spin, and the Lip gaps are narrower.
- **CPU Punishes:** 4.05 per Round, up from 0.2. The CPU now hops toward a Rig that lost a read and Dives once it's close, instead of running a blind timed script, and it doesn't hop near the Rim.
- **A resource on attacks:** **Gears**. Speed is built on the Rim Line, read as 0–3 pips, and spent by Dash and Hook. A Whirl steals it.

**Addressed in the third pass (the vertical slice):**
- **Row 3:** Rev spends (see above).
- **Row 11:** the snowball (see above).
- **The Shatter:** 1.09 per Match. It homes, is charged, fragile and dodgeable, and misses 5% of the time.

## 5. Measured vs claimed (2026-09-24)

Every target in the design docs is now **measured** by `npm run balance` (64 CPU vs CPU Matches) and printed as PASS or FAIL. The previous passes *claimed* several of these without measuring them: the comeback rates, the ZENITH snowball, juggle length, time on the Rim Line, and whether a novice can reach any Rank.

| Target (source) | Measured | Verdict |
|---|---|---|
| Round 20–40 s (pitch) | 27.2 s median | PASS |
| Match ≤ 3 min (gameplay/04) | 79 s mean, 141 s longest | PASS |
| Topple ≤ 35% (core-loop) | 19% | PASS |
| Triangle moves 20–40% each (moveset §10) | 38.6 / 30.9 / 30.5% | PASS |
| Always-Dash CPU beats mixed ≤ 60% (GM 10720) | 31% | PASS |
| ≥ 1 read won per Round | 11.3 | PASS |
| ≥ 0.5 Punishes per Round | 2.0 | PASS |
| Dash hits at Gear 2+ ≥ 35% | 85% | PASS |
| Rim Line time ≤ 50% | 27% | PASS |
| First to ZENITH wins ≤ 70% (core-loop said 80%) | 69% | PASS (borderline; ±6% run to run) |
| Rank leader at midpoint wins ≤ 70% | 55% | PASS |
| First hit wins ≤ 75% (gameplay/04) | 48% | PASS |
| Winner dipped below 40% Spin ≥ 25% (gameplay/04) | 48% | PASS |
| Behind at midpoint wins 25–50% (gameplay/03) | 40% | PASS |
| Shatters landed ≥ 1 per Match | 1.09 | PASS |
| Shatter whiffs ≤ 35% | 5% | PASS |
| Rev spends ≥ 0.5 per Round | 3.52 | PASS |
| Longest juggle ≤ 6 | 2 | PASS |
| Novice median peak Rank ≥ Spinning | Blurred | PASS |

**Bugs the measurements exposed (fixed, with regression tests):**
- **Mid-air re-Pop** (from the Gears pass). Falling back into `pop` after an air move re-ran the Pop's hop, so Rigs climbed to 200–340 units and floated out over the Rim. This inflated Spills in every earlier balance pass. Test: `airGame.test.ts`.
- **"Ghost" cancelled the other direction of a contact.** A Rig with i-frames (for example the Shatter user) made the rival's side resolve to "no hit", and that could win the pair and cancel the i-framed Rig's own hit. Test: `resolveHit.test.ts` (`pickDirection`).
- **Rev spent by mashing.** Any press during recovery spent a Rank. Rev Cancel is now the deliberate J+L chord. Test: `revSpend.test.ts`.
- **Checked, not a bug:** the touch controls on a fresh phone load. They show at once on a coarse-pointer device. The earlier sighting came from switching the viewport to mobile *after* the page loaded.

**Still open (honest limits):**
- **All numbers are CPU vs CPU.** A human proxy exists only as the novice CPU. Real hand-feel still needs a playtest.
- **"First to ZENITH wins" sits right at its target.** Treat it as a watch item.
- **Juggles are short** (longest 2 hits). That's safe, but the air game may be under-used by the CPU.
