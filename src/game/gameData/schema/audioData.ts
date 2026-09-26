import type { SoundRecipe } from '@engine/audio/synth';

/** Procedural sound recipes and which message plays which (data/game/audio/sounds.json). */
export interface AudioData {
  readonly master: { readonly gain: number };
  readonly recipes: Readonly<Record<string, SoundRecipe>>;
  readonly cues: {
    /** moveFlow state → recipe, on MoveStarted. */
    readonly moves: Readonly<Record<string, string>>;
    /** hits.json name → recipe, on HitLanded; louder with the hit's shake. */
    readonly hits: Readonly<Record<string, string>>;
    readonly hitGainPerShake: number;
    readonly countdownBeat: string;
    readonly countdownGo: string;
    readonly pointsAwarded: string;
    readonly rankUp: string;
    readonly shatterReady: string;
    readonly refused: string;
    readonly roundFinished: string;
  };
  readonly mute: { readonly key: string; readonly storageKey: string; readonly label: string; readonly mutedLabel: string };
}
