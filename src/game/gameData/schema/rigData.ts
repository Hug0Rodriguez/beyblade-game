export interface RigDefinition {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly accentColor: string;
  readonly radius: number;
  readonly weight: number;
  /** Top speed from the stick alone; anything above is surplus (momentum). */
  readonly baseSpeed: number;
  readonly maxSpin: number;
  readonly blades: number;
}

/**
 * The shape a Rig's body takes (rigForms.json). All numbers, eased per frame: `along`/`across`
 * stretch the disc along and across the aim (a needle), `tip` sharpens its front, `rimWidth`
 * and `discScale` widen it into a shell, `bladeFold` hides the blades, `splay` opens them up,
 * `armExtend`/`armClose` reach out and shut a claw, `tall`/`wide` scale the screen silhouette
 * (a falling weight), `shadowScale`/`shadowRing` grow the shadow under it.
 */
export interface RigForm {
  readonly along: number;
  readonly across: number;
  readonly tip: number;
  readonly rimWidth: number;
  readonly discScale: number;
  readonly bladeFold: number;
  readonly splay: number;
  readonly wobble: number;
  readonly dim: number;
  readonly armExtend: number;
  readonly armClose: number;
  readonly tall: number;
  readonly wide: number;
  readonly shadowScale: number;
  readonly shadowRing: number;
  readonly spinBoost: number;
}

export interface RigFormSpec extends Partial<RigForm> {
  /** Time constant of the ease toward this form. */
  readonly easeSeconds: number;
  /** The move's colour for the tip, rim, claw and shadow ring (the body keeps the Rig's colour). */
  readonly accent?: string;
  /** Trail while in this form (the needle leaves a thin hard line). */
  readonly trail?: { readonly widthRatio: number; readonly alpha: number };
}

export interface RigFormsData {
  readonly round: RigForm;
  readonly forms: Readonly<Record<string, RigFormSpec>>;
  /** moveFlow state → form name; states not listed are the round top. */
  readonly states: Readonly<Record<string, string>>;
  readonly look: {
    readonly armWidthRatio: number;
    readonly armReachRatio: number;
    readonly rimTickCount: number;
    readonly gapRadians: number;
    readonly tipWidthRatio: number;
    readonly wobbleRadians: number;
    readonly wobblePerSecond: number;
    readonly stunnedWobblePerSecond: number;
    readonly outlineColor: string;
    readonly shadowGrowPerUnit: number;
  };
}

export interface RigData {
  readonly rigs: readonly RigDefinition[];
  readonly rigForms: RigFormsData;
  readonly rigRules: {
    readonly spinDecayPerSecond: number;
    /** Spin a Break Out costs, as a fraction of max Spin. */
    readonly breakOutCostRatio?: number;
  };
}
