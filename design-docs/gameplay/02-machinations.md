# 02 · Machinations: the economy

> Adams & Dormans (Ch. 4, *Internal Economy*) describe an economy as resources plus the rules that move them, through **four economic functions**:
> - **sources** create resources
> - **drains** destroy them
> - **converters** turn one resource into another
> - **traders** move resources between owners without creating any
>
> Every mechanic in this design is one of the four.

The legend for node shapes and arrows is in the [README](README.md#how-to-read-the-diagrams). In short:
- `(( ))` pool
- `[/ \]` source
- `[\ /]` drain
- `{{ }}` converter
- `{ }` gate
- `[[ ]]` trader
- `([ ])` end condition
- a solid arrow is a resource flow; a dotted arrow is a state connection

---

## 0. The economy at a glance

| Resource | Sources (in) | Drains (out) | Converters / traders | End condition |
|---|---|---|---|---|
| **Spin** | Rip · Lunar Siphon (trader) · Lunar Wisp riding the rail | Spin Decay · being hit · Rush cost | Rush (Spin → Velocity) | Spin = 0 → **Spin Finish** |
| **Velocity** | Steering (up to Gear 1) · Xtreme Line (past Gear 1) · Rush · Perfect Rip | Drag · Guard · Clash (spent on the hit) · Wall hits | Clash (Velocity → rival's losses) · Parry (steals Velocity) · Clash Lock (pools both Beys' Velocity) | Knocked through an Over Zone → **Over / Xtreme Finish** |
| **Burst Gauge** | Being hit (scales with the attacker's speed) | Decay once no hit lands for 1.5 s · Last Stand clears it | — | Full → **Burst Finish** |
| **Special Gauge** | Hits dealt · hits taken (more) · Parry · riding at Gear 3 · Last Stand | Spent in full | Special Move (Special Gauge → ability) | — |
| **Points** | Finishes (1 / 2 / 2 / 3) | — | — | 4 or more → **Match Won** |

---

## 1. One Bey's economy: Spin ⇄ Velocity

This is the heart of the design. Spin is what you **have**, Velocity is what you **spend**, and **Rush** is the converter between them.

```mermaid
flowchart LR
    RIP[/"Rip<br/>once per Round<br/>[skill]"\] -->|"90 to 100"| SPIN(("Spin<br/>max 100"))
    SPIN -->|"1.2 per s"| DECAY[\"Spin Decay"/]

    STEER[/"Steer<br/>[skill]"\] -->|"accel, capped at Gear 1"| VEL(("Velocity<br/>Gear 0 to 3"))
    VEL -.->|"≥ Gear 1 activates"| LATCH{"Xtreme Line latch<br/>[skill]"}
    LATCH -->|"+320 per s"| VEL

    SPIN -->|"6 + Heat"| RUSH{{"Rush"}}
    RUSH -->|"+250"| VEL
    RUSH -.->|"+4"| HEAT(("Rush Heat"))
    HEAT -.->|"+ cost"| RUSH
    HEAT -->|"clears 2 s after last Rush"| HCOOL[\"Heat cooldown"/]

    VEL -->|"0.6 × v per s"| DRAG[\"Drag"/]
    VEL -->|"fast, while held ≤ 1.5 s"| GUARD[\"Guard<br/>[strat]"/]
    VEL -->|"65% spent per hit"| CLASH{{"Clash<br/>see diagram 2"}}

    VEL -.->|"Gear 3 activates"| RAILSP[/"Xtreme Dash bonus"\]
    RAILSP -->|"+3 per s"| SPECIAL(("Special Gauge<br/>max 100"))
    SPECIAL -->|"all, when full"| SMOVE{{"Special Move<br/>[skill]"}}

    SPIN -.->|"low Spin: Wobble × steer"| STEER
    SPIN -.->|"== 0"| SF(["Spin Finish"])
```

**How to read it**
- **Two engines feed Velocity**:
  - a **static engine**: steering, which is always on but capped at Gear 1
  - a **dynamic engine**: the Xtreme Line. It only opens (the gate) once you are already moving at Gear 1, and it pays out for as long as you ride it. Speed buys the rail, and the rail buys more speed. That is loop **P1** in [03](03-feedback-loops.md).
- **Rush is the panic button and the burst option.** It turns life into speed right now. Rush Heat is a **stopping mechanism**: each repeat within 2 s costs 4 more Spin.
- **Drag is dynamic friction.** It grows with Velocity, so there is a natural top speed where the rail's gain equals Drag. Past that point only Rush, a Parry or a Clash Lock pushes you higher, for a moment.
- **Guard is a drain you choose.** You give up your own speed to be hard to hurt.

---

## 2. The Clash exchange: attacker → defender

The Clash is where Velocity is **spent**. The attacker is whichever Bey has more Velocity along the collision normal. The defender's **Guard state** chooses which branch the gate takes: that is the fighting-game read.

```mermaid
flowchart LR
    subgraph ATT["Attacker"]
        VA(("Velocity A"))
        SPA(("Special A"))
    end

    subgraph DEF["Defender"]
        GB{"Guard state B<br/>none, Guard, Parry<br/>[skill] [mp]"}
        SB(("Spin B"))
        BB(("Burst Gauge B"))
        VB(("Velocity B"))
        SPB(("Special B"))
    end

    VA -->|"relative speed"| OUT{"Clash outcome<br/>[mp]"}
    GB -.->|"selects branch"| OUT

    OUT -->|"hit"| HIT{{"Hit"}}
    OUT -->|"Guard started within 0.15 s"| PAR[["Parry"]]
    OUT -->|"head-on, both ≥ Gear 2"| LOCK{"Clash Lock<br/>1.2 s mash<br/>[skill] [mp]"}

    HIT -.->|"− rel × 0.02"| SB
    HIT -.->|"+ rel × 0.08"| BB
    HIT -.->|"+ knockback"| VB
    HIT -.->|"+8"| SPA
    HIT -.->|"+12"| SPB
    HIT -.->|"+1"| COMBO(("Combo count"))
    COMBO -.->|"× 100, 80, 65, 50 %"| HIT
    COMBO -->|"resets 1.2 s after last hit"| CRESET[\"Combo reset"/]
    GB -.->|"Guard: × 0.4 Spin, × 0.5 Burst"| HIT

    PAR -->|"80% of Velocity A"| VB
    PAR -.->|"stun 0.4 s"| VA
    PAR -.->|"+25"| SPB

    VB -->|"all"| LOCK
    LOCK -->|"both Velocities, to winner"| HIT

    BB -->|"8 per s, after 1.5 s without a hit"| BDECAY[\"Burst decay"/]
    BB -.->|"== 100"| BF(["Burst Finish"])
    VB -.->|"knockback carries B"| OZ{"Over Zone gate<br/>position"}
    OZ -->|"Gear 3 hit"| XF(["Xtreme Finish"])
    OZ -->|"any other hit"| OF(["Over Finish"])
```

**How to read it**
- **Hit** is a **converter**. It consumes 65% of the attacker's Velocity and, through node modifiers, turns it into the defender's losses:
  - Spin taken away
  - Burst Gauge added
  - knockback Velocity added
  It also pays Special to **both** sides, the defender more.
- **Parry** is a **trader**. Nothing is created: the attacker's Velocity changes owner. This is **attrition reversed**, where the aggressor's own resource becomes the defender's weapon.
- **Clash Lock** is a **gate** with skill and multiplayer determinability. Both Beys pour their Velocity into it, and the mash winner receives the combined total as one Hit. It's the anime beam struggle.
- The **Combo** pool is a **stopping mechanism**. Every hit in a chain adds to the count, and the count scales damage *down*, while the on-screen number goes *up* to feed Sensation.

---

## 3. The Round: escalation and end conditions

A Round must end within about 45 s. **Overdrive** adds time pressure, the fix the MDA paper suggests for a Monopoly game that drags: mechanics that deplete resources over time to speed the game up. **Last Stand** keeps a losing Bey in the fight.

```mermaid
flowchart LR
    CLOCK[/"Round clock"\] -->|"1 per s"| T(("Round time"))
    T -.->|"≥ 30 s activates"| OD{"Overdrive"}
    OD -.->|"× 2.5"| DECAY[\"Spin Decay"/]
    OD -.->|"× 1.5 width"| OZ{"Over Zone gate"}

    SP(("Spin")) -->|"1.2 per s"| DECAY
    SP -.->|"below 25%, once per Round *"| LS[/"Last Stand"\]
    LS -.->|"clear"| BG(("Burst Gauge"))
    LS -->|"+50"| SG(("Special Gauge"))
    LS -.->|"× 1.3 Velocity gain, 5 s"| V(("Velocity"))

    SP -.->|"== 0"| SF(["Spin Finish · 1 pt"])
    BG -.->|"== 100"| BF(["Burst Finish · 2 pts"])
    V -.->|"knockback"| OZ
    OZ -->|"from a Gear 3 hit"| XF(["Xtreme Finish · 3 pts"])
    OZ -->|"otherwise"| OF(["Over Finish · 2 pts"])
```

**How to read it**
- **Round time** is a pool filled by a source at a fixed rate. Past 30 s it **activates** Overdrive, which multiplies the Spin Decay drain and widens the Over Zone gate. This is **escalating challenge** tied to time rather than progress: the longer the Round, the easier it is for anything to finish it.
- **Last Stand** is a one-shot source, fired by a **trigger** (`*`). It aims straight at the destructive loop **P4** (low Spin → Wobble → more damage).
- The four end conditions pay **different amounts**. Aggressive finishes (Over, Burst, Xtreme) are worth more than waiting (Spin), so aggression is the dominant *direction* while Parry keeps it from being the dominant *strategy*.

---

## 4. The Match: points and carry-over

```mermaid
flowchart LR
    FIN[/"Round Finish"\] -->|"1 to 3"| PW(("Round winner's Points"))
    PW -.->|"≥ 4"| MW(["Match Won"])

    HT[/"Hits taken this Round"\] -->|"+12 each"| SGL(("Special Gauge"))
    SGL -->|"carries over"| NEXT(("Special Gauge<br/>next Round"))
    NEXT -->|"when full"| SM{{"Special Move early<br/>next Round"}}
```

**How to read it**
- Points are the only thing that fills toward **Match Won**.
- The **Special Gauge carries over** between Rounds, as super meter does in fighting games. A Blader who has just lost a Round usually took more hits, so they start the next Round closer to a Special Move. It's a gentle, match-level **negative feedback loop** (N10) that doesn't hand anyone points.
