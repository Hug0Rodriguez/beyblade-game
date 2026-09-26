export interface LipGap {
  readonly angleDegrees: number;
  readonly widthDegrees: number;
}

export interface DishDefinition {
  readonly id: string;
  readonly name: string;
  readonly radius: number;
  /** Downhill pull toward the centre at the Rim (units/s²), for grounded Rigs. */
  readonly bowlAccel: number;
  /** Airborne Rigs higher than this clear the Rim. */
  readonly rimHeight: number;
  readonly wallRestitution: number;
  /** How far past the Rim (in Rig radii) a Rig must travel to count as Spilled. */
  readonly spillExitRatio: number;
  readonly lipGaps: readonly LipGap[];
  /** The Rim Line: a band just inside the Rim that speeds up grounded Rigs riding along it (builds Gear). */
  readonly rimLine: {
    /** The band, as fractions of the Dish radius. */
    readonly innerRatio: number;
    readonly outerRatio: number;
    /** Acceleration along the Rig's direction around the Dish (units/s²). */
    readonly accel: number;
    /** Only Rigs at least this fast latch on. */
    readonly minSpeed: number;
  };
  readonly look: {
    readonly floorCenter: string;
    readonly floorEdge: string;
    readonly floorRings: number;
    readonly gridColor: string;
    readonly gridAlpha: number;
    readonly gridRings: number;
    readonly gridSpokes: number;
    readonly rimColor: string;
    readonly rimWidth: number;
    readonly lipColor: string;
    readonly lipStripeColor: string;
    readonly lipDepth: number;
    readonly centerMarkColor: string;
    readonly centerMarkAlpha: number;
    readonly rimLineColor: string;
    readonly rimLineAlpha: number;
    /** The band brightens to this while a Rig rides it. */
    readonly rimLineRidingAlpha: number;
  };
}

export interface DishData {
  readonly dishes: { readonly selected: string; readonly dishes: readonly DishDefinition[] };
}
