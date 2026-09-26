import type { ConditionRow, FsmDefinition } from './common';

export interface FinishCondition extends ConditionRow {
  readonly finish: string;
  readonly points: number;
  readonly banner: string;
  readonly bannerColor: string;
  /** Name of the Rig view effect to play on the losing Rig ("topple", "spill", "shatter"). */
  readonly rigEffect: string;
}

export interface RoundData {
  readonly roundFlow: FsmDefinition;
  readonly roundRules: {
    readonly finishHoldSeconds: number;
    /** roundFlow states in which Finishes are checked. */
    readonly checkFinishesIn: readonly string[];
    readonly roundLabelSeconds: number;
    /** hits.json names that count as a Shatter on the defender. */
    readonly shatterHits: readonly string[];
  };
  readonly finishConditions: readonly FinishCondition[];
  readonly countdown: {
    readonly beats: readonly string[];
    readonly beatSeconds: number;
    readonly dropHeight: number;
    readonly beatColor: string;
    readonly goColor: string;
    /** Drop-in positions per Spinner slot, as fractions of the Dish radius. */
    readonly slots: readonly { readonly x: number; readonly y: number }[];
  };
}
