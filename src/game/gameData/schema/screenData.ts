import type { ScreenLayerSpec } from '@engine/screens/screenHost';

export interface HudData {
  readonly font: { readonly fontFamily: string; readonly fontWeight: string };
  readonly panel: {
    readonly maxWidth: number;
    readonly margin: number;
    readonly nameSize: number;
    readonly detailSize: number;
    readonly gaugeHeight: number;
    readonly gaugeGap: number;
    readonly cornerRadius: number;
    readonly backColor: string;
    readonly backAlpha: number;
    readonly textColor: string;
    readonly detailColor: string;
    readonly spinColor: string;
    readonly spinLowColor: string;
    readonly spinLowRatio: number;
    /** The Shatter-gate tick on the Spin bar. */
    readonly shatterGateColor: string;
    /** Spin bar and label colour in Redline. */
    readonly redlineColor: string;
    readonly gaugeBackColor: string;
  };
  readonly points: { readonly pipRadius: number; readonly pipGap: number; readonly filledColor: string; readonly emptyColor: string };
  readonly banner: {
    readonly fontSize: number;
    readonly smallFontSize: number;
    readonly strokeColor: string;
    readonly popSeconds: number;
    readonly popScale: number;
    readonly yRatio: number;
    readonly smallYRatio: number;
  };
  readonly menuButton: {
    readonly width: number;
    readonly height: number;
    readonly fontSize: number;
    readonly fillColor: string;
    readonly hoverColor: string;
    readonly textColor: string;
    readonly cornerRadius: number;
  };
  readonly hint: { readonly fontSize: number; readonly color: string; readonly bottomMargin: number };
  readonly rev: {
    readonly nameSize: number;
    readonly multiplierSize: number;
    readonly barHeight: number;
    readonly gap: number;
    readonly barBackColor: string;
    readonly rankUpSeconds: number;
    /** Spendable Rank pips: one per Rank above Wobble, filled up to the current Rank. */
    readonly pipRadius: number;
    readonly pipGap: number;
    readonly pipEmptyColor: string;
  };
  readonly callout: {
    readonly fontSize: number;
    readonly riseSpeed: number;
    readonly seconds: number;
    readonly strokeColor: string;
    readonly offsetY: number;
    readonly capacity: number;
    /** Callout colours: Rev gained, a read won (hits in `bigHits`), Rev lost, and a stale repeat. */
    readonly gainColor: string;
    readonly bigColor: string;
    readonly lossColor: string;
    readonly staleColor: string;
    readonly bigHits: readonly string[];
    /** Rev spends (Rev Cancel, Rev Break) show in the spend colour, not as a loss. */
    readonly spendColor: string;
    readonly spendReasons: readonly string[];
    readonly redlineColor: string;
    /** Size multiplier for a won read's callout. */
    readonly bigScale: number;
  };
  readonly shatterPrompt: { readonly fontSize: number; readonly color: string; readonly yRatio: number; readonly pulsePerSecond: number };
  readonly screenLayout: {
    readonly titleSize: number;
    readonly titleYRatio: number;
    readonly taglineSize: number;
    readonly taglineYRatio: number;
    readonly promptSize: number;
    readonly promptYRatio: number;
    readonly controlsSize: number;
    readonly controlsYRatio: number;
    readonly startButtonYRatio: number;
    readonly titleColor: string;
    readonly taglineColor: string;
    readonly promptColor: string;
    readonly resultTitleSize: number;
    readonly resultTitleYRatio: number;
    readonly resultButtonsYRatio: number;
    readonly buttonGap: number;
    readonly backdropColor: string;
    readonly backdropAlpha: number;
    readonly promptPulsePerSecond: number;
  };
}

export interface ScreenData {
  readonly screens: {
    readonly background: string;
    readonly worldMargin: number;
    readonly fsm: string;
    readonly layers: readonly ScreenLayerSpec[];
    readonly visibleIn: Readonly<Record<string, readonly string[]>>;
  };
  readonly copy: {
    readonly title: string;
    readonly tagline: string;
    readonly titlePromptKeyboard: string;
    readonly titlePromptTouch: string;
    readonly startButton: string;
    readonly controlsKeyboard: string;
    readonly controlsTouch: string;
    readonly brawlHintKeyboard: string;
    readonly brawlHintTouch: string;
    readonly matchWinner: string;
    readonly rematch: string;
    readonly toTitle: string;
    readonly roundLabel: string;
    readonly rematchKeyHint: string;
    readonly shatterPromptKeyboard: string;
    readonly shatterPromptTouch: string;
  };
}
