import type { HudData } from '../gameData/schema/screenData';

export interface PanelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** +1 for panels anchored on the left edge, -1 on the right edge. */
  readonly side: 1 | -1;
}

/** Where the HUD panel of a Spinner slot sits. Slot 0 = left edge, slot 1 = right edge. */
export function panelRect(slot: number, screenWidth: number, hud: HudData): PanelRect {
  const { margin, maxWidth } = hud.panel;
  const width = Math.min(maxWidth, (screenWidth - margin * 3) / 2);
  const side = slot % 2 === 0 ? 1 : -1;
  return { x: side === 1 ? margin : screenWidth - margin - width, y: margin, width, side };
}

/** Height of the Rig panel: name row, detail row, Spin gauge. */
export function panelHeight(hud: HudData): number {
  const { nameSize, detailSize, gaugeHeight, gaugeGap } = hud.panel;
  return gaugeGap + nameSize + gaugeGap + detailSize + gaugeGap + gaugeHeight + gaugeGap;
}

/** Top of the Rev Rank block, right under the Rig panel. */
export function revBlockY(hud: HudData): number {
  return hud.panel.margin + panelHeight(hud) + hud.rev.gap;
}

/** Height of the Rev Rank block: Rank name row, progress bar, spendable Rank pips. */
export function revBlockHeight(hud: HudData): number {
  return hud.rev.nameSize + hud.rev.gap + hud.rev.barHeight + hud.rev.gap + hud.rev.pipRadius * 2;
}

/** Top of whatever sits under the Rev block (points pips). */
export function underPanelY(hud: HudData): number {
  return revBlockY(hud) + revBlockHeight(hud) + hud.points.pipGap;
}
