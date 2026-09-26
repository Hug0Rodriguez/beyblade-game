export interface RevRank {
  readonly name: string;
  /** Rev points needed to reach this Rank. */
  readonly threshold: number;
  /** Damage multiplier while at this Rank. */
  readonly multiplier: number;
  readonly color: string;
}

export interface StyleData {
  readonly revRanks: {
    readonly ranks: readonly RevRank[];
    readonly maxPoints: number;
    /** From this Rank index up, the Rig's Spin stops decaying. */
    readonly sustainFromRank: number;
    /** Rank index that unlocks the Shatter. */
    readonly shatterRank: number;
  };
  readonly revGains: {
    /** Points per landed hit, by hits.json name. */
    readonly hits: Readonly<Record<string, number>>;
    /** Extra points when the hit came straight off a Rim bounce. */
    readonly afterRimBonus: number;
    readonly airtimePerSecond: number;
    readonly surplusPerSecond: number;
    /** Speed / base speed above which surplus movement earns points. */
    readonly surplusSpeedRatio: number;
    /** Callout text per reason (hit name or "afterRim"). */
    readonly labels: Readonly<Record<string, string>>;
  };
  readonly revRules: {
    /** How many recent hits count for variety. */
    readonly varietyWindow: number;
    /** Gain multiplier by how many times that hit is already in the window. */
    readonly varietyFactors: readonly number[];
    readonly idleGraceSeconds: number;
    readonly idleDecayPerSecond: number;
    /** Fraction of its Rev a Rig loses when it gets hit. */
    readonly hitPenaltyRatio: number;
    /** Hits that mean you lost a read (countered, punished…) cost this fraction instead, by hit name. */
    readonly lossPenaltyRatios: Readonly<Record<string, number>>;
    /** Landing these hits spends this fraction of the attacker's Rev (the Shatter cashes it all in). */
    readonly spendOnHit: Readonly<Record<string, number>>;
    /** The comeback: below `spinRatio`, Rev gains × `gainMultiplier` and passive losses can't take you below `floorRank`. */
    readonly redline: { readonly spinRatio: number; readonly gainMultiplier: number; readonly floorRank: number };
    /** A hit taken at or above the Shatter Rank also drops at least this many Ranks (ZENITH is fragile). */
    readonly topRankHitDrop: number;
    /** Seconds a Rig must hold the Shatter Rank before the Shatter is ready (the rival's window to answer). */
    readonly shatterChargeSeconds: number;
    /** The rival's Spin ratio below which the Shatter can be used. */
    readonly shatterRivalSpinRatio: number;
    /** Ranks lost when an attack move ends without landing, by move name. */
    readonly whiffPenaltyRanks: Readonly<Record<string, number>>;
  };
}
