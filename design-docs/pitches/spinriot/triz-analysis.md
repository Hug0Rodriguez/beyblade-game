# TRIZ analysis: from "Beyblade" to SPINRIOT

**TRIZ** is Altshuller's *Theory of Inventive Problem Solving*. It holds that inventive designs come from **resolving contradictions** instead of compromising between two requirements. The method:

1. State the **Ideal Final Result (IFR)**: the function is delivered with none of the cost.
2. Find the **contradictions** that stand in the way:
   - **Technical:** improving parameter A worsens B.
   - **Physical:** one element must be both X and not-X.
3. Resolve physical contradictions with the **separation principles**: in time, in space, on condition, or between the system and its parts.
4. Resolve technical ones with the **40 inventive principles**.
5. Check the result against the **trends of evolution**.

---

## 1. The system

| Element | Role in a top battle |
|---|---|
| Top | Stores rotational energy (its life) and delivers it through contact |
| Arena (bowl) | Contains the tops and pulls them together; its edges allow ring-outs |
| Player | Launches the top, and in video games also steers it |
| Contact | The only way energy moves from one top to the other |

**What the system is for:** *one spinning top defeats another through contact.*

**What the player wants:** *to defeat the opponent **in style and in flow**, and to feel it in their hands.*

## 2. The Ideal Final Result

> *"The top obeys you instantly, never loses momentum, and every hit it lands makes the next one bigger, until the rival shatters."*

Every contradiction below is something standing between the current prototype and this sentence.

---

## 3. Contradictions and their resolutions

### C1 · Character control ⟷ spinning-top physics *(physical)*
- **Must be:** direct and tight, like a character (the answer to "direct, character-like").
- **Must not be:** a puck with no momentum. It has to feel like a top, with carried speed and bounces (the answer to "Sonic / Rocket League").
- **Separation:** **by speed band**, which is separation on condition.
  - Up to **base speed**, the stick has full, instant authority.
  - **Surplus speed**, the part above base, is momentum. The stick can only *redirect* it, and it fades slowly.
- **Principles:** **3 Local quality** (different parts of the speed range behave differently) and **15 Dynamization** (control authority changes with state).
- **Mechanic:** base and surplus Speed. Walking feels like a character; going fast feels like a top.

### C2 · Heavy hits ⟷ unbroken flow *(physical)*
- **Must:** stop time, because hit-stop is what makes impact *feel* heavy.
- **Must not:** stop time, because flow means never stopping.
- **Separation:** **in time**. Freeze for 50–90 ms, then **rush through**: instead of ending your motion, the hit *redirects* it.
- **Principles:** **21 Skipping / rushing through** (pass the harmful moment quickly) and **22 Blessing in disguise** (the collision that would kill your momentum becomes its source).
- **Mechanic:** the **Ricochet**. Each hit bounces you onward with your Speed kept, aimed by the stick, so hits *link* instead of *ending*.

### C3 · Reward style ⟷ don't reward mashing *(technical)*
- **Improving:** the reward for aggressive action.
- **Worsening:** variety. Players just spam the best move.
- **Principles:** **35 Parameter change**: a move's value depends on how recently it was used. Adams & Dormans would call this a *stopping mechanism*.
- **Mechanic:** Rev gain is based on variety. A repeated move earns less each time, and a fresh one earns full value.

### C4 · Three buttons ⟷ DMC-level depth *(technical)*
- **Improving:** simplicity: ADHD-friendly, fits on mobile.
- **Worsening:** the size of the move list, which is what gives expressive depth.
- **Principles:** **1 Segmentation** (split each input by context), **5 Merging** (combine inputs, as in Whirl + Dash for the Shatter), **15 Dynamization** (a button's meaning changes with state).
- **Mechanic:** a **context move table** of 3 buttons × ground / air / in-contact. Every move cancels into every other, which gives more than ten moves from three buttons.

### C5 · Decisive combos ⟷ defender agency *(technical)*
- **Improving:** how much a combo pays off.
- **Worsening:** fairness and tension. Being juggled to death isn't fun.
- **Principles:** **9 Prior counteraction** and **11 Beforehand cushioning**: give the defender a planned escape with a cost.
- **Mechanic:** **Break Out**. A juggled Rig spends Spin to burst free, so escaping is always possible and never free.

### C6 · Spin must drain ⟷ flow should sustain *(physical)*
- **Must:** drain, so Rounds end.
- **Must not:** drain, because the player should be rewarded for flowing, not punished for existing.
- **Separation:** **on condition**. Spin decays unless you are at a high Rev Rank.
- **Principles:** **23 Feedback** (the system's output, style, controls its input, decay) and **25 Self-service** (the system sustains itself through its own function).
- **Mechanic:** from Cyclone Rank up, your Spin stops decaying. Stalling slowly kills you; flowing keeps you alive.

### C7 · Reward style ⟷ keep clean wins possible *(technical)*
- **Improving:** style as *the* way to win ("style powers the kill").
- **Worsening:** accessibility. A less stylish player must still be able to win.
- **Principles:** **35 Parameter change** applied to the end state: every way of winning pays a different amount.
- **Mechanic:** Topple 1 · Spill 2 · **Shatter 3**, with the Shatter gated by ZENITH. Style is the *efficient* path, not the only one.

### C8 · Contain the fight ⟷ allow spectacle and ring-outs *(physical)*
- **Must:** contain the Rigs, so the fight happens.
- **Must not:** contain them, because ring-outs and big air are spectacle.
- **Separation:** **in space**, by using another dimension.
- **Principles:** **17 Another dimension** (the z-axis) and **4 Asymmetry** (Rim zones versus Lip gaps).
- **Mechanic:** Pop, Air and Dive, plus the Lip. Going airborne near the edge is both the flashiest play and the riskiest.

---

## 4. Principles used (summary)

| # | Principle | Where |
|---|---|---|
| 1 | Segmentation | C4: buttons split by context |
| 3 | Local quality | C1: the speed bands |
| 4 | Asymmetry | C8: Rim and Lip |
| 5 | Merging | C4: Whirl + Dash = Shatter |
| 9 | Prior counteraction | C5: Break Out |
| 11 | Beforehand cushioning | C5: Break Out |
| 15 | Dynamization | C1, C4: control authority and button meaning change with state |
| 17 | Another dimension | C8: the z-axis |
| 21 | Skipping (rushing through) | C2: micro hit-stop |
| 22 | Blessing in disguise | C2: the Ricochet |
| 23 | Feedback | C6: Rank stops decay |
| 25 | Self-service | C6: flow sustains itself |
| 35 | Parameter change | C3, C7: variety-based gains, finish values |

## 5. Trends of evolution

| Trend | From → to |
|---|---|
| **Increasing dynamism and controllability** | Launch and watch (toy) → steered puck (prototype) → **direct real-time fighter** (SPINRIOT) |
| **Coordination of rhythms** | Random collisions → **chained ricochets**, where cancels and bounces fall into a rhythm the player drives |
| **Transition to the super-system** | Energy comes from the launch alone → **energy comes from how you play**: style sustains Spin and multiplies damage |
| **Increasing use of dimensions** | A flat stadium → a Dish with a **z-axis** (Pop, Air, Dive, Launch) |

## 6. Traceability

Every mechanic in the [README](README.md) goes back to at least one contradiction.

| Mechanic | Contradiction(s) |
|---|---|
| Base and surplus Speed | C1 |
| Ricochet | C2 |
| Variety-based Rev gain | C3 |
| Context move table · cancels | C4 |
| Break Out | C5 |
| Rank stops Spin decay | C6 |
| Rank multiplies damage · Shatter at ZENITH | C7 |
| Finish values 1 / 2 / 3 | C7 |
| Pop · Air · Dive · Launch · Lip | C8 |
| Deflect | C5 (defender agency), C2 (it reverses the hit without stopping flow) |
