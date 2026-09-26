import type { RouteTableData } from '@engine/messaging/routeTable';
import type { AudioData } from './schema/audioData';
import type { BrawlData } from './schema/brawlData';
import type { ConditionRow, FsmDefinition } from './schema/common';
import type { DishData } from './schema/dishData';
import type { MovesData } from './schema/movesData';
import type { RigData } from './schema/rigData';
import type { RoundData } from './schema/roundData';
import type { HudData, ScreenData } from './schema/screenData';
import type { SpinnerData } from './schema/spinnerData';
import type { StyleData } from './schema/styleData';

export interface BootMessage {
  readonly type: string;
  readonly values: Readonly<Record<string, number | string>>;
}

/** A gameFlow state where a menu listens to the Spinner's buttons. */
export interface MenuActivity {
  /** Human commands that trigger the menu action. */
  readonly commands: readonly string[];
  /** Message published when one of them is pressed. */
  readonly message: string;
}

/** Everything under data/game, typed. Read-only by convention (the tuning panel edits it live). */
export interface GameData {
  readonly messaging: { readonly routes: RouteTableData };
  readonly boot: {
    readonly capacities: {
      readonly spinners: number;
      readonly rigs: number;
      readonly particles: number;
      readonly trailPoints: number;
      readonly messageQueues: Readonly<Record<string, number>>;
    };
    readonly bootMessages: readonly BootMessage[];
    readonly random: { readonly seed: number };
  };
  readonly flow: {
    readonly gameFlow: FsmDefinition;
    readonly activity: {
      /** gameFlow states in which bodies move. */
      readonly simulation: readonly string[];
      /** gameFlow states in which Spinner commands are issued. */
      readonly commands: readonly string[];
      /** gameFlow states in which Spin and Rev drain (the fight is on). */
      readonly brawling: readonly string[];
      /** Entering one of these starts a new Round. */
      readonly roundStartsOn: readonly string[];
      readonly menus: Readonly<Record<string, MenuActivity>>;
    };
  };
  readonly spinner: SpinnerData;
  readonly rig: RigData;
  readonly moves: MovesData;
  readonly brawl: BrawlData;
  readonly dish: DishData;
  readonly style: StyleData;
  readonly round: RoundData;
  readonly match: {
    readonly matchRules: {
      readonly pointsToWin: number;
      readonly winWhen: ConditionRow['when'];
      /** The Match checks for a winner when this FSM enters this state. */
      readonly settleWhen: { readonly fsm: string; readonly state: string };
    };
  };
  readonly hud: { readonly hud: HudData };
  readonly screens: ScreenData;
  readonly audio: { readonly sounds: AudioData };
}
