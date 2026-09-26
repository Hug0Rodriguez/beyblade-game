> **Update (2026-09-24): the moveset is now a triangle.** DASH › HOOK › WHIRL › DASH, with DIVE as the Punisher. See **[moveset-triangle.md](moveset-triangle.md)**. It replaces the controls and chains below, which were marked as superseded. Why it changed: [../../audit/book-compliance.md](../../audit/book-compliance.md).

# SPINRIOT

> **Implementation status** (checked against `data/game` and `src/game`, 2026-09-24):
> - ✅ implemented
> - ◐ partial (the gap is noted)
> - ☐ not implemented
>
> What's left is collected in [Implementation checklist](#implementation-checklist-whats-left) at the end.

> **Your top is a fighter.** It moves like a character: instant and precise. It hits like a Rocket League car. And it **never stops moving**, because every hit **ricochets** you onward with your speed intact.
>
> Chain **Dash**, **Pop** and **Whirl**, bouncing off your rival, the walls and the air, and your **Rev Rank** climbs:
> *Wobble → Steady → Spinning → Blurred → Cyclone → Vortex → ZENITH*.
> The higher your Rank, the harder you hit.
>
> At **ZENITH**, with your rival's Spin low, the **Shatter** opens up: a slow-motion finisher that bursts their top apart. You *can* win ugly by waiting out their Spin, but that's worth a third of the points. **Style is how you kill.**
>
> ◐ *Status: the pitch's "speed intact" ricochet was changed by design. A landed Dash now keeps 35% of your speed, because every attack spends Gear ([moveset-triangle §5](moveset-triangle.md#5-gears-speed-is-what-every-attack-spends)). There are now four buttons: Dash, Jump/Dive, Whirl, Hook.*

| | |
|---|---|
| ✅ **Genre** | 1v1 style-action brawler with spinning tops |
| **Feel** | Devil May Cry / Bayonetta combos and style rank · Sonic / Tony Hawk momentum · Rocket League physics hits |
| ✅ **Session** | Rounds of 20–40 s · first to 4 points · Matches under 3 minutes *(measured: 27 s Rounds, 79 s Matches on average)* |
| ◐ **Platforms** | Desktop (keyboard or gamepad) and mobile (touch) *(keyboard ✅, touch ✅, gamepad ☐)* |
| ✅ **Still tops underneath** | Spin is life, the arena is a bowl, collisions transfer energy, and Rounds end in ring-outs, bursts or spin-outs |

Documents in this folder:
- [triz-analysis.md](triz-analysis.md): how the design was *derived*. It covers the contradictions in "a top as a fighting game" and the TRIZ principles that resolve them.
- [moveset-triangle.md](moveset-triangle.md): **the current moveset**. It covers the counter triangle, the Punisher, the air game, the read table, the three loops and the cue table.
- [core-loop.md](core-loop.md): the loop, the economy (Machinations sketch), every positive and negative feedback loop, and the failure modes.

The Beyblade-faithful alternative is [../../gameplay/](../../gameplay/README.md) ("Xtreme Velocity").

---

## Why this isn't a Beyblade copy

| Beyblade | SPINRIOT |
|---|---|
| You launch, then watch (or steer a puck) | You **pilot a fighter** in real time, with a character-tight feel |
| Hits are physics you hope for | Hits are **moves you choose**, and each one **ricochets** into the next |
| Winning means outlasting | Winning means **out-styling**: your Rev Rank multiplies damage and unlocks the kill |
| Customization is the depth | **Execution** is the depth: cancels, air juggles, ricochet lines |
| Stadium, Bey, Blader, Burst | Dish, Rig, Spinner, Shatter: an original vocabulary |

The *engine* is still a top battle: Spin, a bowl and energy transfer. The *game* is a style brawler, and that difference is mechanical, not cosmetic.

---

## Glossary

| Term | Meaning |
|---|---|
| **Spinner** | The player (or the CPU) |
| **Rig** | Your top, which is also your fighter |
| **Dish** | The arena: a bowl whose slope pulls toward the centre, with a raised **Rim** and **Lip** gaps at the edge |
| **Spin** | Life. It drains slowly over time and in chunks when you're hit. At 0 your Rig **Topples**. |
| **Speed** | How fast your Rig moves. **Base Speed** comes from the stick. **Surplus Speed** sits above base and comes from Dashes, downhill slopes and ricochets; it fades slowly. |
| **Ricochet** | Landing a hit bounces you onward with your Speed kept, aimed by the stick |
| **Launch** | Knocking the rival into the air (the z-axis), where they can be juggled. Every triangle win launches the loser. |
| **Hook** | The throw: grab the rival and sling them where you aim. It beats Whirl and loses to Dash. |
| **Punish** | A Dive onto a Rig that is stunned, launched or recovering |
| **Rev Rank** | The style ladder: Wobble · Steady · Spinning · Blurred · Cyclone · Vortex · **ZENITH** |
| **Shatter** | The finisher. It's only available at ZENITH against a low-Spin rival, and it bursts their Rig. |
| **Spill** | Knocking the rival out over the Lip |
| ✅ **Topple** | The rival's Spin runs out |
| **Break Out** | While juggled, spend Spin to burst free (a combo breaker) |
| **Deflect** | A hit into an active Whirl is turned back on the attacker, who is launched while the Whirler takes its speed (COUNTER!) |

---

## Controls: a stick and 3 buttons, everything cancelable (superseded)

> Superseded by [moveset-triangle.md](moveset-triangle.md). There are now 4 buttons: DASH J · POP/DIVE K · WHIRL L · HOOK I. Moves commit you (tell → active → recovery). This section is kept for history.

The same three buttons do different things depending on **where you are**: on the ground, in the air, or in contact with the rival. That gives a DMC-sized move list with a mobile-sized button count.

| Input | On the ground | In the air | Into the rival |
|---|---|---|---|
| **Stick** | Tight movement: about 80 ms to reach base speed, about 80 ms to stop, a fast turn rate | Air drift | **Aims the ricochet** out of every hit |
| **Dash** | A burst of Surplus Speed with brief invulnerability; it cancels any move | Air dash | **Strike**: a ricochet hit |
| **Pop** | A hop onto the z-axis (real tops hop off ridges) | Press again to **Dive**: a ground slam | Pop over them, then Dive onto them |
| **Whirl** | A radial spin burst | An aerial spin | **Launch** them airborne. Timed on contact, it's a **Deflect**. |
| **Whirl + Dash** | — | — | **Shatter**: glows only at ZENITH against a rival below 60% Spin, and spends all your Rev |

**Bindings**
- Desktop: WASD or arrows, plus **J** (Dash), **K** (Pop), **L** (Whirl), or a gamepad.
- Mobile: floating joystick on the left and three buttons on the right. The Shatter prompt pulses when it's available.

### Sample chains
These are skill-toy "tricks", each of which gets a callout.

| Chain | Inputs | What happens |
|---|---|---|
| **Pinball** | Dash → Strike → ricochet into the wall → Strike | Two hits, Speed kept, a big Rev gain for the wall bounce |
| **Uppercut Rally** | Whirl (Launch) → Pop → air Whirl → Dive | An air juggle ending in a slam |
| **Rim Rider** | Ride the Rim at speed → Dash off the Lip → Dive onto the rival | Airtime plus a slam from above |
| **Counter Storm** | Deflect → Dash → Strike | A read that turns into an immediate punish |

---

## Style: how you defeat them

**The Rev Rank goes up for:**
- ✅ a **move you haven't used recently** (variety)
- ✅ **ricochet chains**, especially rival → wall → rival (PINBALL!)
- ✅ **airtime and juggles**
- ☐ **grazes**, meaning near misses at high Speed *(not implemented)*
- ◐ **Rim grinds** and **Dive slams** *(Dive slams ✅; there's no Rim grind trick, only the Rev that high speed on the Rim Line earns)*
- ✅ **Deflects**

**The Rev Rank goes down when:**
- ✅ you **repeat** the same move, which earns less each time
- ✅ you **idle**, since the Rank decays without fresh action
- ✅ you **get hit**, which costs 15% of your Rev, or 30% when you lose an exchange (COUNTERED)

**What the Rank does** (updated 2026-09-24; Ranks are also spent, see [moveset-triangle §6](moveset-triangle.md#6-style-rev-is-earned-by-reads-and-spent-to-survive-or-to-kill)):

| Rank | Damage multiplier | Extra |
|---|---|---|
| ✅ Wobble | ×1.0 | — |
| ✅ Steady | ×1.1 | — |
| ✅ Spinning | ×1.2 | — |
| ✅ Blurred | ×1.35 | — |
| ✅ Cyclone | ×1.5 | Your Spin stops decaying |
| ✅ Vortex | ×1.7 | Your Spin stops decaying |
| ✅ **ZENITH** | ×2.0 | Your Spin stops decaying · the **Shatter** charges for 1.4 s, then unlocks against a rival below 65% Spin, and spends all your Rev |

**Finishes pay by style.** First to 4 points wins the Match.

| Finish | How | Points |
|---|---|---|
| **Topple** | The rival's Spin reaches 0 | 1 |
| ✅ **Spill** | The rival is knocked out over the Lip | 2 |
| ✅ **Shatter** | The finisher at ZENITH | **3** |

---

## Kinesthetic feel spec

Steve Swink (*Game Feel*) defines game feel as *real-time control of virtual objects in a simulated space, with interactions emphasized by polish*. Each of his metric groups becomes something we tune as data.

| Metric group | SPINRIOT target |
|---|---|
| ◐ **Input** | Analog stick for direction, three digital buttons. Input is read **before** each simulation step, as the engine's route order already guarantees. *(Read-before-step ✅; analog on touch ✅; keyboard is 8-way; gamepad analog ☐; there are four buttons now)* |
| ✅ **Response** | First visible motion within **100 ms** (Swink's threshold for an instant response), aiming for 1–2 frames. Movement is an envelope: a short attack to base speed, a short release to stop, a high turn rate. Surplus Speed carries momentum and fades slowly, like Sonic. All of it lives in a table. *(tested: base speed within 100 ms, a stop within 100 ms)* |
| ◐ **Context** | The bowl slope gives free speed going downhill, as in Tony Hawk. Walls are ricochet surfaces. The Rim is a grind line. The Lip is both a launch ramp and a Spill risk. *(Slope ✅, wall ricochets ✅, Lip Spill ✅. The grind line became the **Rim Line** speed band ◐. The Lip launch ramp ☐.)* |
| ◐ **Polish** | Hit-stop of 50–90 ms, longer at higher Rank. Squash and stretch on hits and landings. The trail heats up through Rank colours. The camera leads movement and zooms out with Speed. A shout-out on each Rank-up. A slow-motion cut-in for the Shatter. *(Hit-stop by hit kind ✅, but not longer at higher Rank ☐. Squash ✅. The trail is coloured by **Gear** now, not Rank ◐. Camera lead and zoom ✅. Rank-up shout ✅. Shatter slow-mo ✅, but no cut-in portrait ☐.)* |
| ✅ **Metaphor** | A top that fights. Wobble shows low Spin, sparks show contact, and the Rig visibly hops for Pop. |

---

## Reuse: what carries over from the current prototype

> ◐ *Historical: this was the plan before implementation. The domains were renamed as it went (stadium → dish, bey → rig, battle → brawl, blader → spinner), so these paths no longer exist. The "New" row was all built (style, moves, the z-axis, the move table).*

| SPINRIOT | Existing code or data |
|---|---|
| Dish (bowl, walls, Lip gaps) | `src/game/domains/stadium/` · `data/game/stadium/stadiums.json` |
| Hits and ricochets | Clash impulse in `src/game/domains/battle/rules/` (the ricochet adds speed retention and a stick-aimed bounce) |
| Spin, Burst, Wobble | The bey domain (renamed to Rig) |
| Rounds, Matches, finishes | `data/game/round/`, `data/game/match/` FSMs and the finish condition tables |
| Input | The keyboard device and touch widgets in `src/engine/input/` |
| **New** | A Rev Rank domain (condition tables for gains and losses) · a move FSM per Rig (ground / air / launched / juggled) · a z-axis column · a context move table |

---

## Implementation checklist: what's left
Checked against the code on 2026-09-24. Everything else in this pitch is ✅, or has been superseded by [moveset-triangle.md](moveset-triangle.md), which has its own checklist (§11).

- [ ] ☐ **Gamepad** support (analog stick and buttons)
- [ ] ☐ **Grazes**: Rev for near misses at high Speed
- [ ] ☐ **Rim grinds** as a style trick. Today the Rim Line only builds speed, and speed earns Rev.
- [ ] ☐ **The Lip as a launch ramp**
- [ ] ☐ **Hit-stop and shake that grow with Rank**
- [ ] ☐ **A Shatter cut-in** (portrait or zoom card). The slow-mo exists.
- [ ] ◐ **Trail colour**: it heats through **Gear** colours, not Rank colours. *Decide:* keep Gear (it's the readable speed tell) or blend in the Rank.

