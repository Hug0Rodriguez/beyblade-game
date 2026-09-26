import type { BurstData, ConditionRow } from './common';

export interface HitOutcomeRule extends ConditionRow {
  readonly hit: string;
}

export interface HitSpec {
  /** none: pass through · bounce: plain physics · hit: damage, knockback, ricochet. */
  readonly effect: 'none' | 'bounce' | 'hit';
  /** The defender turns it around: it lands as the defender's hit on the attacker (Deflect). */
  readonly reverse?: boolean;
  /** Knock the defender toward the attacker's stick instead of straight away (the Hook's sling). */
  readonly aimKnockback?: boolean;
  /** hits.json row that lands if the knocked-back defender hits the Rim soon after (sling → wallSplat). */
  readonly onRim?: string;
  readonly restitution?: number;
  readonly minSpeed?: number;
  /** Damage and knockback at Gear 1; the attacker's Gear (gears.json) multiplies them. */
  readonly damage?: number;
  readonly knockback?: number;
  /** false = fixed damage/knockback whatever the Gear (Dive, Spike, Wall Splat, Shatter). */
  readonly gearScaled?: boolean;
  readonly launchVz?: number;
  readonly ricochetKeep?: number;
  readonly ricochetAim?: number;
  readonly ricochetMinSpeed?: number;
  readonly defenderIFrames?: number;
  /** moveFlow event sent to the defender / attacker ("launched", "stunned", ""). */
  readonly defenderEvent?: string;
  readonly attackerEvent?: string;
  readonly hitStop?: number;
  readonly shake?: number;
  readonly label?: string;
}

/** One Gear: speed in four readable steps (Velocity is the economy). */
export interface GearRow {
  readonly gear: number;
  /** Speed ÷ the Rig's base speed at which this Gear starts. */
  readonly minSpeedRatio: number;
  readonly damageMultiplier: number;
  readonly knockbackMultiplier: number;
  /** Trail and pip colour ("" = the Rig's own colour). */
  readonly color: string;
}

export interface GearData {
  readonly gears: readonly GearRow[];
  /** A Gear drops only when speed falls this fraction below its threshold (no flicker at the edge). */
  readonly dropMargin: number;
  readonly look: {
    readonly pipRadius: number;
    readonly pipGap: number;
    /** Pips sit this many Rig radii above the Rig. */
    readonly pipLiftRatio: number;
    readonly flameWidth: number;
    readonly flameAlpha: number;
    readonly flameFlickerPerSecond: number;
    /** Callout when a Rig reaches the top Gear. */
    readonly maxGearCallout: string;
  };
}

export interface MotionData {
  readonly baseAccel: number;
  readonly baseDecel: number;
  readonly surplusTurnRate: number;
  readonly surplusTurnPenaltyPerSpeed: number;
  readonly surplusFadePerSecond: number;
  readonly surplusIdleFadePerSecond: number;
  readonly maxSpeed: number;
  readonly gravity: number;
  readonly airAccel: number;
  readonly airMaxSpeed: number;
  /** Rigs whose heights differ by more than this pass over each other. */
  readonly contactHeight: number;
  /** Move states in which the stick does nothing. */
  readonly noControlStates: readonly string[];
  /** Move states that keep turning toward the nearest rival (the Shatter), at `homingTurnRate` rad/s. */
  readonly homingStates: readonly string[];
  readonly homingTurnRate: number;
  /**
   * Attack kinds that connect at any height difference against a Rig in `heightlessTargetStates`
   * (the Shatter catches a juggled or stunned rival, but a voluntary Pop still jumps over it).
   */
  readonly heightlessAttackKinds: readonly string[];
  readonly heightlessTargetStates: readonly string[];
  /** Move states that plant the Rig (Whirl brace, Dash rev-up, Hook reach): no steering, speed bleeds off. */
  readonly brakeStates: readonly string[];
  /** How fast a planted Rig loses its speed (exponential, per second). */
  readonly brakePerSecond: number;
  /** Seconds after a sling in which hitting the Rim counts as a Wall Splat. */
  readonly slingRimSeconds: number;
  readonly spinDirection: number;
  /** A hit this soon after bouncing off the Rim counts as a Rim ricochet (HitLanded.afterRim). */
  readonly rimChainSeconds: number;
  /** attackerAbove = attacker higher than the defender by more than this. */
  readonly aboveThreshold: number;
  /** Each extra juggle hit before landing launches this much less high (multiplier per hit). */
  readonly juggleLaunchDecay: number;
  /** No launch carries a Rig higher than this (kept under the Rim height: only the Lip gaps Spill). */
  readonly launchApexCap: number;
}

export interface CameraData {
  readonly followRate: number;
  readonly zoomRate: number;
  readonly nearDistance: number;
  readonly farDistance: number;
  readonly nearZoom: number;
  readonly farZoom: number;
  readonly speedZoomOut: number;
  readonly leadSeconds: number;
  readonly centerPull: number;
  readonly hitPunchPerShake: number;
  readonly finishPunch: number;
}

/** What the two Rigs do on the frame a hit lands (outcomeFx.json): the clash shows why it went that way. */
export interface OutcomeEffect {
  readonly attacker: string;
  readonly defender: string;
  readonly fragments: number;
  /** "attacker" / "defender" (that Rig's colour) or a hex colour. */
  readonly fragmentColor: string;
  readonly fragmentsAlong: 'n' | 'back' | 'around';
  /** Ground ring radius as a multiple of the defender's radius (0 = none). */
  readonly ring: number;
  /** Directional squash of the defender along the hit normal. */
  readonly squash: number;
}

export interface OutcomeFxData {
  readonly effects: Readonly<Record<string, OutcomeEffect>>;
  readonly fragment: { readonly speedMin: number; readonly speedMax: number; readonly life: number; readonly sizeRatio: number; readonly drag: number; readonly spread: number };
  readonly ring: { readonly seconds: number; readonly width: number; readonly alpha: number; readonly color: string };
  readonly holdFormSeconds: number;
  readonly pullStretch: number;
  readonly pullSeconds: number;
  readonly rimFlashSeconds: number;
  readonly wrapArcRadians: number;
  readonly wrapRadiusRatio: number;
}

export interface BrawlFxData {
  readonly bumpSparks: BurstData & { readonly minSpeed: number };
  readonly wallSparks: BurstData & { readonly minSpeed: number };
  /** Particles when a move starts, by move name. "behind" = opposite the aim, "around" = all around. */
  readonly moveBursts: Readonly<Record<string, BurstData & { readonly direction: 'behind' | 'around' }>>;
  /** Tells: what a Rig shows before its move lands, and the feedback for committed or refused presses. */
  readonly tells: {
    readonly recover: { readonly moves: readonly string[]; readonly color: string; readonly alpha: number; readonly pulsePerSecond: number };
    readonly refused: { readonly color: string; readonly seconds: number };
    readonly tether: { readonly color: string; readonly width: number; readonly seconds: number };
    /** The inviting sign while a Rev Cancel is available (recovering or stunned, with a Rank to spend). */
    readonly revCancel: { readonly color: string; readonly alpha: number; readonly label: string; readonly fontSize: number };
    /** The Shatter charging at ZENITH: an arc filling around the Rig, pulsing once charged. */
    readonly shatterCharge: { readonly color: string; readonly width: number; readonly alpha: number; readonly readyPulsePerSecond: number };
  };
  readonly landingDust: BurstData & { readonly minImpact: number };
  readonly trail: { readonly length: number; readonly widthRatio: number; readonly alpha: number; readonly minSpeed: number; readonly surplusAlpha: number };
  readonly shake: { readonly decayPerSecond: number; readonly frequency: number; readonly maxOffset: number; readonly finishKick: number };
  readonly hitStopScale: number;
  readonly flashSeconds: number;
  readonly squash: { readonly hitAmount: number; readonly landAmount: number; readonly recoverPerSecond: number };
  readonly finishSlowMo: { readonly scale: number; readonly seconds: number };
  readonly shatter: {
    readonly startSlowMo: { readonly scale: number; readonly seconds: number };
    readonly hitSlowMo: { readonly scale: number; readonly seconds: number };
    readonly hitPunch: number;
    readonly burst: BurstData;
  };
  /** How height (z) is drawn in the top-down view. */
  readonly height: {
    readonly liftPerUnit: number;
    readonly scalePerUnit: number;
    readonly shadowShrinkPerUnit: number;
    readonly shadowAlpha: number;
    readonly shadowOffset: number;
  };
}

export interface BrawlData {
  readonly outcomeFx: OutcomeFxData;
  readonly motion: MotionData;
  readonly hitOutcomes: readonly HitOutcomeRule[];
  readonly hits: Readonly<Record<string, HitSpec>>;
  readonly gears: GearData;
  readonly brawlFx: BrawlFxData;
  readonly camera: CameraData;
}
