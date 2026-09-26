import type { GameData } from '../gameData/gameData';

/** CSS custom properties for the GUI root, from hud.json, so stylesheets and data can't disagree. */
export function guiTokens(data: GameData): Record<string, string> {
  const hud = data.hud.hud;
  return {
    '--gui-font': hud.font.fontFamily,
    '--gui-weight': hud.font.fontWeight,
    '--panel-back': hud.panel.backColor,
    '--panel-text': hud.panel.textColor,
    '--panel-detail': hud.panel.detailColor,
    '--accent': hud.menuButton.fillColor,
    '--accent-hover': hud.menuButton.hoverColor,
    '--hint-text': hud.hint.color,
  };
}
