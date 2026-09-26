# 04 · Tuning sheet, targets and data mapping

> MDA: *"the last step… involves play testing and tuning. By iteratively refining the value of penalties… we can refine the Monopoly gameplay until it is balanced."*
>
> Every number below is a **starting point**. The prototype is data-first, so each one lives in a JSON file under `data/game/**` and can be tuned live with the tuning panel (`` ` ``).

---

## 1. Starting numbers

Units: Stadium radius = 300 units. Velocity is in units/s. Spin, the Burst Gauge and the Special Gauge each run 0–100.

### Spin
| Quantity | Value | Notes |
|---|---|---|
| Max Spin | 100 | Displayed ×100 as RPM |
| Spin Decay | 1.2 / s | About 80 s alone, so decay is never the main clock |
| Rip: Good / Perfect | 90 / 100 | A Perfect Rip also starts the Bey at Gear 2 |
| Rip timing window (Perfect / Good) | ±0.08 s / ±0.25 s around "RIP!" | |

### Velocity and Gears
| Quantity | Value | Notes |
|---|---|---|
| Gear thresholds | Gear 1 ≥ 150 · Gear 2 ≥ 300 · Gear 3 ≥ 480 | Max 600 |
| Steering acceleration | 700 / s² | |
| Steering speed cap | 300 | Top of Gear 1 |
| Xtreme Line latch | Gear 1 or higher, within 20 units of the rail radius | |
| Xtreme Line acceleration | +320 / s² | Gear 1 → Gear 3 in about 2.5 s |
| Drag | 0.6 × v per s | Equilibrium on the rail ≈ 530 (Gear 3) |
| Wall hit | Keeps 60% of Velocity | |

### Rush
| Quantity | Value |
|---|---|
| Base cost | 6 Spin |
| Velocity gained | +250 in the stick direction (the facing direction if the stick is idle) |
| Rush Heat | +4 cost for each Rush within 2 s of the last one |

### Clash
| Quantity | Value | Notes |
|---|---|---|
| Spin damage | relative normal speed × 0.02 | Gear 3 hit ≈ 10–12; Gear 1 poke ≈ 3–4 |
| Burst fill | relative normal speed × 0.08 | Gear 3 ≈ 40; Gear 1 ≈ 15 |
| Attacker keeps | 35% of its Velocity | |
| Knockback | 90% of the attacker's normal speed | |
| Combo window | 1.2 s | |
| Combo scaling | 100 / 80 / 65 / 50% | |
| Hit i-frames | 0.25 s | |
| Hit-stop | Gear 0–1: 60 ms · Gear 2: 90 ms · Gear 3: 120 ms and a freeze-frame | |
| Screen shake | Scales with Gear | |

### Guard and Parry
| Quantity | Value |
|---|---|
| Guard multipliers | ×0.4 Spin damage · ×0.5 Burst · ×0.5 knockback |
| Guard Velocity drain | 4 × v per s (you plant fast) |
| Guard hold cap / cooldown | 1.5 s / 1.0 s |
| Parry window | Guard started 0.15 s or less before impact |
| Parry: Velocity stolen | 80% |
| Parry: attacker stun | 0.4 s |
| Parry: Special gain | +25 |

### Clash Lock
| Quantity | Value |
|---|---|
| Trigger | Head-on (angle between velocities 150° or more) and both Beys at Gear 2 or higher |
| Duration | 1.2 s at 0.3× time scale |
| Resolution | Rush presses counted; the winner gets both Velocities as one Hit; a tie is a mutual bounce |
| CPU mash rate | 6–10 per s, by profile |

### Burst Gauge
| Quantity | Value |
|---|---|
| Max | 100; full means a Burst Finish |
| Decay | 8 / s, starting 1.5 s after the last hit |

### Special Gauge
| Quantity | Value |
|---|---|
| Max | 100 |
| Gains | +8 per hit dealt · +12 per hit taken · +25 per Parry · +3/s while riding at Gear 3 |
| Carry-over between Rounds | 100% |

### Round and Match
| Quantity | Value |
|---|---|
| Countdown | "3 · 2 · 1 · RIP!" at 0.6 s per beat |
| Overdrive starts | 30 s |
| Overdrive effect | Spin Decay ×2.5 · Over Zone width ×1.5 |
| Last Stand | Spin < 25, once per Round · Burst cleared · +50 Special · Velocity gain ×1.3 for 5 s |
| Points | Spin 1 · Over 2 · Burst 2 · Xtreme 3 |
| Points to win | 4 |

### Bey Type passives (multipliers on the numbers above)
| Bey Type | Passive |
|---|---|
| Attack (Tempest Drake) | Rail acceleration ×1.2 · Rush Heat +3 instead of +4 |
| Defense (Iron Bastion) | Parry window 0.22 s · knockback taken ×0.8 |
| Stamina (Lunar Wisp) | Spin Decay ×0.5 · +1 Spin/s while latched to the rail |
| Balance (Crimson Viper) | Special gains ×1.15 |

---

## 2. Measurable targets

These are the MDA aesthetics turned into numbers the headless harness (`npm run balance`) can check. If a target fails, [03 · Failure modes](03-feedback-loops.md#failure-modes-to-watch) names the knob to turn.

| Aesthetic / pillar | Metric | Target |
|---|---|---|
| Short loops | Time from Rip to the first Clash | ≤ 3 s |
| Short loops | Mean time between Clashes | ≤ 4 s |
| Short loops | Round length | 15–45 s (median about 25 s) |
| Short loops | Match length | ≤ 3 min |
| Always something to press | Longest stretch with no meaningful input (human-proxy CPU) | ≤ 1.5 s |
| Sensation | Share of Clashes at Gear 2 or higher | ≥ 40% |
| Sensation | Clash Locks per Match | ≥ 1 |
| Fantasy | Special Moves per Round (both Bladers together) | ≥ 1 |
| Challenge | Share of Rush-ins answered by a Parry (mixed-profile CPU) | 10–25% |
| Competition | Finish mix | Spin ≤ 30% · Over, Burst and Xtreme ≥ 70% together |
| Competition | Rounds won by a Blader who dropped below 40% Spin | ≥ 25% |
| Competition | Rounds won by whoever landed the first hit | ≤ 75% |
| Fairness | Each preset's win rate against the field | 40–60% |

---

## 3. Data mapping (for the rework)

The rework keeps the architecture's rules:
- tables for state
- **condition tables** for conditionals
- **FSMs** for states
- **messages** for all communication
- routes in `routes.json`

### 3.1 Data files
| Mechanic | Data home | Kind |
|---|---|---|
| Gears | `data/game/battle/gears.json` | Condition table: Velocity → Gear 0–3, with trail colour and hit-stop per Gear |
| Steering, Drag, speed cap | `data/game/battle/motion.json` (existing, reshaped) | Tuning |
| Xtreme Line | `data/game/stadium/stadiums.json` (the `tornadoRidge` block becomes `xtremeLine`) | Tuning: radius, latch band, acceleration, minimum Gear |
| Rush and Rush Heat | `data/game/bey/beyRules.json` (existing `rush` block) | Tuning |
| Clash outcome | `data/game/battle/clashOutcomes.json` | Condition table: `parry` → `clashLock` → `guardedHit` → `hit`, first match by priority |
| Clash numbers, combo scaling, i-frames | `data/game/battle/clash.json` (existing, reshaped) | Tuning plus a combo-scaling array |
| Guard and Parry | `data/game/bey/guardRules.json` | Tuning |
| Guard states | `data/game/bey/guardFlow.json` | FSM: `ready → guarding → cooldown → ready`. The Parry window is `timeInState` in `guarding`. |
| Clash Lock | `data/game/battle/clashLockFlow.json` | FSM: `idle → locked → resolved`. `timeInState ≥ $lockSeconds` resolves it. |
| Burst Gauge | `data/game/bey/beyRules.json` (`burst` block) | Tuning: fill and decay |
| Special Gauge | `data/game/bey/specialGains.json` | Table of gain per event message type |
| Special Moves | `data/game/bey/specialMoves.json` (existing, reshaped) | Each move is a sequence of **effect rows**, e.g. `homingRush ×3`, `autoParry 3s`, `siphon 4s`, `hookPull`. The effects are data, and a small set of effect kinds lives in code. |
| Bey Type passives | `data/game/bey/beyTypePassives.json` | Condition table: Bey Type → multipliers |
| Wobble | `data/game/bey/wobbleRules.json` (existing) | Condition table, now also affecting steering and knockback resistance |
| Last Stand | `data/game/round/lastStandRules.json` | Condition table plus effects; the once-per-Round rule is existence-based (a `lastStandUsed` table) |
| Round flow | `data/game/round/roundFlow.json` (existing) | FSM: `countdown → battling → overdrive → finishing → scored` |
| Finishes | `data/game/round/finishConditions.json` (existing) | Adds an `xtreme` row, priority before `over`, when `[["overZoneHitGear", "==", 3]]` |
| Launcher | `data/game/launcher/launcherFlow.json` and `ripGrades.json` (existing) | FSM becomes `countdown → ripped`; grades by timing offset instead of meter phase |
| CPU Tactics | `data/game/blader/cpu/cpuTactics.json` (existing) | FSM adds `rideRail`, `guard` and `parry` Tactics; profiles gain `parryChance` and `mashRate` |
| Controls | `data/game/blader/human/keyboard.json`, `touch.json` (existing) | Adds Guard; Rip moves to "Rush on the beat" |
| HUD | `data/game/hud/hud.json` (existing) | Three bars per Bey plus the Gear display and combo counter |

### 3.2 New messages
| Message | Published by | Main listeners |
|---|---|---|
| `GearChanged {beyId, gear}` | battle | bey view (trail and flames), blader (CPU senses), stadium (rail latch) |
| `RailLatched / RailReleased {beyId}` | stadium | battle (acceleration), bey (Special gain), view |
| `GuardStarted / GuardEnded {beyId}` | bey (guardFlow FSM) | battle (drain, clash outcome), view |
| `Parried {defenderId, attackerId, stolenVelocity}` | battle | bey (Special +25, stun), view (flash), blader (CPU learns) |
| `ClashLockStarted / ClashLockResolved {winnerId, combinedVelocity}` | battle (clashLockFlow FSM) | engine time scale, blader (mash input), view |
| `ComboChanged {beyId, count}` | battle | view (combo counter) |
| `OverdriveStarted {}` | round (roundFlow FSM enters `overdrive`) | bey (decay ×), stadium (Over Zone width), view |
| `LastStandTriggered {beyId}` | round | bey (clears Burst, adds Special), battle (Velocity gain), view (cut-in) |
| `RipBeat {beat}` | launcher | view (countdown), blader (CPU Rip timing) |

Existing messages kept as they are: `ClashDetected`, `BeySpinChanged`, `BurstStressChanged` (becomes the Burst Gauge), `SpecialChargeChanged` (becomes the Special Gauge), `RushStarted`, `SpecialMoveTriggered`, `RoundFinished`, `PointsAwarded`, `MatchWon`.

### 3.3 What gets removed
- The Rip Meter's oscillating phase (`ripMeter.json` period and aim-arc logic)
- `tornadoRidgeForce` as a permanent tangential push. It's replaced by the Xtreme Line, which you choose to ride.
- `clashModifiers.json` Bey Type matchups, replaced by visible passives

---

## 4. Next step

1. Playtest this design **on paper first**: run a few exchanges with the numbers above against the targets in §2.
2. Then rework the domains in the order the diagrams go:
   1. Velocity and Gears, plus the Xtreme Line (diagram 1)
   2. The Clash outcome, with Guard and Parry (diagram 2)
   3. Overdrive, Last Stand and the Xtreme Finish (diagram 3)
   4. Special Moves as abilities
3. After each step, extend the balance harness with the matching metrics from §2.
