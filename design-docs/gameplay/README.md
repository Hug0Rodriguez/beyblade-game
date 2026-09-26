# Xtreme Velocity: gameplay loop design

> **Note (2026-09-23): not the current direction.** These docs redesign the loop while staying faithful to Beyblade. They were followed by the **[SPINRIOT pitch](../pitches/spinriot/README.md)**, an original style-and-flow top brawler that answers the "don't be a Beyblade copy" feedback.
>
> This folder is kept as the **fallback route** and as a reference that SPINRIOT reuses:
> - the Velocity-as-economy idea
> - the Machinations and feedback-loop method
> - the tuning targets
> - the data mapping
>
> Don't implement from these docs unless the Beyblade-faithful route is chosen again.

> **Pitch.** Two Beys fight in a bowl like fighting-game characters. **Velocity is your currency**: ride the Xtreme Line to Gear Up, then cash that speed in by slamming into your rival. Hit hard and they lose Spin. Hit hard and often and they Burst. Hit hard into the edge and they fly out. Guard to plant yourself, Parry to steal the attacker's speed, and fill your Special Gauge for an anime-style Special Move. An exchange takes 2 to 4 seconds, a Round lasts under 45, and a Match takes under 3 minutes.

This folder redesigns the Beyblade prototype's core loop. It uses two references:

- **MDA**: Hunicke, LeBlanc & Zubek, *MDA: A Formal Approach to Game Design and Game Research* ([resources/mda-framework.md](../resources/mda-framework.md)). We design from the player's side first (Aesthetics → Dynamics → Mechanics), then build back up from Mechanics.
- **Machinations**: Adams & Dormans, *Game Mechanics: Advanced Game Design* ([resources/game_mechanics](../resources/game_mechanics)). From it we use:
  - the four economic functions: source, drain, converter, trader
  - Machinations nodes and connections
  - the seven feedback characteristics plus determinability (Table 6.1, Table 6.2)
  - the design-pattern library in Chapter 7

## Documents

| # | Document | Answers |
|---|---|---|
| 1 | [01-mda.md](01-mda.md) | Why the current game doesn't work · what it should feel like · the dynamics and mechanics that get there |
| 2 | [02-machinations.md](02-machinations.md) | The economy as diagrams: which resources exist, and where they come from and go |
| 3 | [03-feedback-loops.md](03-feedback-loops.md) | Every positive and negative feedback loop, profiled and paired with the loop that checks it |
| 4 | [04-tuning-and-data.md](04-tuning-and-data.md) | Starting numbers · measurable targets · where each mechanic lives in `data/game/**` |

Read them in order. Each one assumes the vocabulary below.

## Glossary

Terms that are new or changed by this redesign are marked **★**.

| Term | Meaning |
|---|---|
| **Bey** | The spinning top: a Layer, a Disc and a Driver |
| **Blader** | A competitor, either the human or the CPU |
| **Spin** | The Bey's rotational energy, which acts as its **life**. At 0 it's a Spin Finish. |
| **Velocity** ★ | The Bey's linear speed, which is the **economy resource**. You earn it by moving, spend it by hitting, and lose it to Drag. |
| **Gear** ★ | Velocity in readable steps: **Gear 0 / 1 / 2 / 3**. It's shown on the Bey as trail colour, and flames at Gear 3. |
| **Xtreme Line** ★ | The rail ring near the Stadium edge (replaces the Tornado Ridge). Riding it accelerates you. |
| **Xtreme Dash** ★ | Riding the Xtreme Line at Gear 3 |
| **Rush** | A dash that turns Spin into Velocity instantly. It is never locked, just more expensive when repeated (**Rush Heat** ★). |
| **Guard** ★ | Hold to plant yourself: you stop, and take less damage, Burst and knockback |
| **Parry** ★ | A Guard that starts just before a hit: you take nothing and **steal** the attacker's Velocity |
| **Clash** | Two Beys colliding. The faster Bey's Velocity becomes the other Bey's losses. |
| **Clash Lock** ★ | A head-on Clash with both Beys at Gear 2 or higher. It triggers a short slow-motion mashing struggle. |
| **Combo** ★ | Hits landed in quick succession. The counter rises while each hit's damage scales down. |
| **Burst Gauge** | Fills as you take hard hits and drains when you aren't hit. When full, it's a Burst Finish. |
| **Special Gauge** | A super meter. Filling it enables your Bey's **Special Move**. |
| **Special Move** | A Bey-specific ability with a cut-in. It is the signature ability of the Bey's Layer. |
| **Wobble** | The instability that comes with low Spin |
| **Last Stand** ★ | A once-per-Round anime comeback when Spin gets low |
| **Overdrive** ★ | The escalation phase once a Round passes 30 seconds |
| **Over Zone** | A gap in the Stadium wall. A Bey knocked through it is out. |
| **Spin / Over / Burst / Xtreme Finish** | The four ways a Round ends: 1, 2, 2 or 3 points. **Xtreme** ★ is an Over Finish caused by a Gear 3 hit. |
| **Round · Match · Points** | Rounds are played until a Blader has 4 points |

## How to read the diagrams

[02-machinations.md](02-machinations.md) draws Machinations diagrams in Mermaid. Mermaid has no native Machinations symbols, so node shapes stand in for node types.

| Shape in the diagrams | Machinations node | Behaviour (Adams & Dormans, Appendix A) |
|---|---|---|
| `((Spin))` circle | **Pool** | Collects and holds resources |
| `[/Rip\]` trapezoid | **Source** | Creates resources out of nothing |
| `[\Drag/]` inverted trapezoid | **Drain** | Consumes resources for good |
| `{{Rush}}` hexagon | **Converter** | Consumes one resource to produce another |
| `{Latch}` diamond | **Gate** | Pulls resources and redistributes them at once, by condition or chance |
| `[[Parry]]` double box | **Trader** | Moves resources from one owner to another; nothing is created |
| `([Spin Finish])` stadium | **End condition** | Ends the Round when its condition holds |

Arrows:
- **Solid arrow** (`-->`): a **resource connection**, meaning a resource flows. The label is the flow rate.
- **Dotted arrow** (`-.->`): a **state connection**, meaning the state of one node changes another. Labels use the Machinations conventions:
  - `+` / `−`: a label modifier
  - `×`: a multiplier
  - `≥x`: a condition that works as an activator
  - `*`: a trigger

Determinability tags from Table 6.2 appear in brackets:
- **[det]**: deterministic
- **[rnd]**: random
- **[skill]**: skill
- **[mp]**: multiplayer, meaning it depends on the other Blader
- **[strat]**: strategy
