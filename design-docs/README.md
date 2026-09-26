# Design docs

| Folder | Status | What it is |
|---|---|---|
| [pitches/spinriot/](pitches/spinriot/README.md) | **Current direction — implemented** in `src/game` + `data/game` (2026-09-24). Tune live with `` ` ``; measure with `npm run balance`. Every item is marked ✅ / ◐ / ☐, with a "what's left" checklist at the end. | SPINRIOT, an original style-and-flow brawler built on spinning tops. Derived with TRIZ; the feel spec follows Swink's *Game Feel*. |
| [pitches/spinriot/moveset-triangle.md](pitches/spinriot/moveset-triangle.md) | **Current moveset** (2026-09-24) | The counter triangle (DASH › HOOK › WHIRL › DASH), with DIVE as the Punisher, and the same triangle in the air. **Gears**: speed is built on the Rim Line and spent by every attack. **Rev spends** (Rev Cancel, Rev Break, a charged Shatter) and **Redline**. Includes the read table, 3 loops, a cue table, and the balance report card (all 23 targets pass). Status: 89 ✅, 6 ◐, listed in §11. |
| [audit/book-compliance.md](audit/book-compliance.md) | Audit (2026-09-24; re-scored with measurements) | Rule-by-rule check of the gameplay docs, the SPINRIOT pitch and the build against *Game Mechanics*, *Gamer's Brain* and *Game Feel*. It shows where each one only partially complied, and why the old loop had no "why". |
| [gameplay/](gameplay/README.md) | Fallback / reference | "Xtreme Velocity", a Beyblade-faithful loop redesign (MDA, Machinations, feedback loops, tuning, data mapping). It's superseded by SPINRIOT, but its method and parts are reused. |
| [resources/](resources/) | Reference | Source texts: the MDA framework, *Game Mechanics* (Adams & Dormans), *Game Feel* (Swink), *The Gamer's Brain* (Hodent) |

**Rejected pitches**, kept here so we don't revisit them:
- **SPINLASH**: whip-impulse control. Rejected because it had no continuous flow.
- **TIPDRIFT**: drift and tip-grip movement. Rejected because it missed the point, which is beating the opponent in style.
