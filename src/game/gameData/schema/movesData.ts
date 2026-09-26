import type { ConditionRow, FsmDefinition } from './common';

/** How a move changes the Rig's body when it starts (brawl applies it). */
export type MoveImpulse = 'burst' | 'boost' | 'hop' | 'dive' | 'spin' | 'homing' | 'breakOut' | 'none';

export interface MoveSpec {
  readonly impulse: MoveImpulse;
  /** burst / dive / homing: horizontal speed. */
  readonly speed?: number;
  /** boost: speed added on top of the Rig's current speed (the Dash spends what you built). */
  readonly boost?: number;
  /** hop / dive / breakOut: vertical speed (dive: downward). */
  readonly vz?: number;
  /** How long the move can land a hit (0 = never). */
  readonly activeSeconds: number;
  readonly iFrameSeconds: number;
  readonly cooldownSeconds: number;
  /** Which hitOutcomes rows apply: "strike" (Dash), "guard" (Whirl), "grab" (Hook), "slam" (Dive), "shatter", "none". */
  readonly attackKind: string;
  /** Hit radius multiplier while active (the Whirl ring and the Hook reach further). */
  readonly reachRatio?: number;
  /** The reach only covers this arc around the aim (the Hook grabs in front); omitted = all around. */
  readonly reachArcRadians?: number;
  /** Aim with the stick as it was when the button was pressed (the Hook grabs where you pointed; the sling then follows the stick). */
  readonly aimAtPress?: boolean;
  /** Spin the move costs, as a fraction of max Spin (Break Out). */
  readonly spinCostRatio?: number;
  /** Rev Ranks the move costs (Rev Break). */
  readonly revRankCost?: number;
}

export interface MoveRule extends ConditionRow {
  readonly move: string;
}

/** One move's silhouette: an SVG path in a 24×24 box pointing up (north = the aim), and its colour. */
export interface MoveGlyph {
  readonly label: string;
  /** The attackKind it stands for (strike / guard / grab / slam / shatter / none). */
  readonly role: string;
  readonly color: string;
  readonly path: string;
  /** moveFlow states during which the Rig shows this glyph. */
  readonly moves: readonly string[];
}

/** What beats what, as signs: the rival shows `sees`, the answer is `answer`, pressed on `button`. */
export interface CounterSign {
  /** An attackKind, or "vulnerable" (moveTuning.vulnerableStates). */
  readonly sees: string;
  readonly answer: string;
  /** The touch button widget that answers. */
  readonly button: string;
}

export interface MoveGlyphsData {
  readonly glyphs: Readonly<Record<string, MoveGlyph>>;
  /** Touch button widget → glyph. */
  readonly buttonGlyphs: Readonly<Record<string, string>>;
  readonly counters: readonly CounterSign[];
  /** The cycle, each beating the next: dash › hook › whirl › dash. */
  readonly triangle: readonly string[];
  /** Hit name (hits.json) → the glyph of the move that won it. */
  readonly hitGlyphs: Readonly<Record<string, string>>;
  readonly dishTells: { readonly glyphSizeRatio: number; readonly glyphDistanceRatio: number; readonly glyphWidth: number; readonly glyphAlpha: number };
}

export interface MovesData {
  readonly moveFlow: FsmDefinition;
  readonly moveTable: readonly MoveRule[];
  readonly moveGlyphs: MoveGlyphsData;
  readonly moveTuning: {
    /** Name of the per-Rig move FSM (other domains watch its StateEntered messages). */
    readonly fsm: string;
    /** $refs for moveFlow timeInState guards. */
    readonly timings: Readonly<Record<string, number>>;
    /** Move states in which no new move can start (except those rows that allow it). */
    readonly lockedStates: readonly string[];
    /** Move states that leave the Rig open to a Punish (stunned, launched, recovering). */
    readonly vulnerableStates: readonly string[];
    readonly moves: Readonly<Record<string, MoveSpec>>;
    /** Rev Cancel: the Dash + Whirl chord in one of these states (recovery, stun) spends `rankCost` Ranks and returns the Rig to state `to`. */
    readonly revCancel: { readonly states: readonly string[]; readonly rankCost: number; readonly to: string };
    /**
     * Moves that start when a timer reaches them (dashRevUp → dash, hookReach → hook). Every other
     * move starts only when pressed; reaching it by a timer (airDash → pop) doesn't re-run it.
     */
    readonly chainedMoves: readonly string[];
    /** Seconds within which Dash and Whirl count as pressed together. */
    readonly comboWindowSeconds?: number;
  };
}
