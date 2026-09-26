import type { FsmDefinition } from './common';

export type SpinnerController = 'human' | 'cpu';

export interface SpinnerEntry {
  readonly id: number;
  readonly name: string;
  readonly controller: SpinnerController;
  readonly rigId: string;
  /** CPU profile (cpu Spinners only). */
  readonly profileId: string;
}

/** Every command a person can give. Steer* are held; the rest are presses. */
export type HumanCommandName = 'steerUp' | 'steerDown' | 'steerLeft' | 'steerRight' | ButtonName | 'confirm';

/** The action buttons a Spinner command carries. */
export type ButtonName = 'dash' | 'pop' | 'whirl' | 'hook';

export interface JoystickData {
  readonly widget: string;
  readonly radius: number;
  readonly knobRadius: number;
  readonly deadzone: number;
  readonly baseColor: string;
  readonly baseAlpha: number;
  readonly knobColor: string;
  readonly knobAlpha: number;
}

export interface TouchButtonData {
  readonly widget: string;
  /** Which command(s) the button presses. */
  readonly command: ButtonName | 'shatter';
  readonly label: string;
  /** Where it sits in the pad: the tall "primary" column, the "stack" column, or the "chord" row on top. */
  readonly slot: 'primary' | 'stack' | 'chord';
  readonly color: string;
  /** Dragging the held button aims the move during its wind-up. */
  readonly aimable?: boolean;
  /** Only shown while this Spinner's Shatter is ready (or, with `revLabel`, while a Rev Cancel is available). */
  readonly onlyWhenShatterReady?: boolean;
  /** Label while the same chord would Rev Cancel instead (recovering or stunned with a Rank to spend). */
  readonly revLabel?: string;
}

export interface CpuProfile {
  readonly id: string;
  readonly decisionSeconds: number;
  readonly steerJitter: number;
  /** Every other key is a "$ref" for cpuTactics guards. */
  readonly [ref: string]: string | number;
}

export interface TacticCommand {
  readonly steer: string;
  readonly steerScale: number;
  /** Buttons pressed on the step the Tactic is entered. */
  readonly press: readonly ButtonName[];
  /** Press them again at every decision while in the Tactic (a committed Rig refuses presses). */
  readonly repeatPress?: boolean;
  /** Optional timed button script (cpuCombos.json id), started on entering the Tactic. */
  readonly combo?: string;
}

export interface CpuCombo {
  readonly id: string;
  readonly steps: readonly { readonly at: number; readonly press: ButtonName }[];
}

export interface SpinnerData {
  readonly spinners: readonly SpinnerEntry[];
  readonly keyboard: { readonly bindings: Readonly<Record<HumanCommandName, readonly string[]>> };
  readonly touch: {
    readonly joystick: JoystickData;
    readonly buttons: readonly TouchButtonData[];
    readonly buttonStyle: { readonly alpha: number; readonly pressedAlpha: number; readonly labelColor: string; readonly fontSize: number };
    readonly aim: { readonly thresholdPx: number };
    /** The action pad grid: gaps, margins, how tall it is in landscape, how wide the primary column is. */
    readonly pad: { readonly gapPx: number; readonly marginPx: number; readonly landscapeHeightRatio: number; readonly primaryColumnRatio: number };
  };
  readonly cpuProfiles: readonly CpuProfile[];
  readonly cpuTactics: FsmDefinition;
  readonly tacticCommands: Readonly<Record<string, TacticCommand>>;
  readonly cpuCombos: readonly CpuCombo[];
}
