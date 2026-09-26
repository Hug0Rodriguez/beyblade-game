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

export interface RigData {
  readonly rigs: readonly RigDefinition[];
  readonly rigRules: {
    readonly spinDecayPerSecond: number;
    /** Spin a Break Out costs, as a fraction of max Spin. */
    readonly breakOutCostRatio?: number;
  };
}
