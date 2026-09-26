import { Container, Graphics, Text, type TextStyleFontWeight } from 'pixi.js';
import { ViewportResized } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { fitText } from '@engine/ui/fitText';
import { createGauge, type Gauge } from '@engine/ui/gauge';
import { RigReady, RigSpinChanged } from '../../../messages/rigMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import { RedlineChanged } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { panelHeight, panelRect } from '../../../shared/hudLayout';
import { spinnerOfRig } from '../../../shared/ids';

interface Panel {
  readonly slot: number;
  readonly spinnerName: string;
  readonly root: Container;
  readonly back: Graphics;
  readonly title: Text;
  readonly detail: Text;
  readonly spinText: Text;
  readonly spin: Gauge;
  /** Tick on the Spin bar where this Rig becomes Shatterable (style.revRules.shatterRivalSpinRatio). */
  readonly gate: Graphics;
  width: number;
  /** In Redline: the Spin bar and its label turn red. */
  redline: boolean;
  spinRatio: number;
}

/** One HUD panel per Spinner: "NAME · RIG", Spin bar (with the Shatter-gate tick; red in Redline) and Spin %. */
export function rigHudHandlers(ctx: ViewContext): HandlerDef[] {
  const hud = ctx.data.hud.hud;
  const p = hud.panel;
  const fontWeight = hud.font.fontWeight as TextStyleFontWeight;
  const panels = new Map<number, Panel>();
  let screenWidth = 0;

  const text = (size: number, fill: string) => new Text({ text: '', style: { fontFamily: hud.font.fontFamily, fontWeight, fontSize: size, fill } });

  const layout = () => {
    const height = panelHeight(hud);
    for (const panel of panels.values()) {
      const rect = panelRect(panel.slot, screenWidth, hud);
      const inner = rect.width - p.gaugeGap * 2;
      const alignRight = rect.side === -1;
      panel.width = inner;
      panel.root.position.set(rect.x, rect.y);
      panel.back.clear().roundRect(0, 0, rect.width, height, p.cornerRadius * 2).fill({ color: p.backColor, alpha: p.backAlpha });
      let y = p.gaugeGap;
      for (const item of [panel.title, panel.detail]) {
        item.anchor.set(alignRight ? 1 : 0, 0);
        item.x = alignRight ? rect.width - p.gaugeGap : p.gaugeGap;
      }
      fitText(panel.title, inner);
      panel.title.y = y;
      y += p.nameSize + p.gaugeGap;
      panel.detail.y = y;
      panel.spinText.anchor.set(alignRight ? 0 : 1, 0);
      panel.spinText.x = alignRight ? p.gaugeGap : rect.width - p.gaugeGap;
      panel.spinText.y = y;
      y += p.detailSize + p.gaugeGap;
      panel.spin.resize(inner);
      panel.spin.view.position.set(p.gaugeGap, y);
      const gateRatio = ctx.data.style.revRules.shatterRivalSpinRatio;
      const gateX = p.gaugeGap + inner * (panel.slot % 2 === 1 ? 1 - gateRatio : gateRatio);
      panel.gate.clear().rect(gateX - 1, y - 3, 3, p.gaugeHeight + 6).fill({ color: p.shatterGateColor });
    }
  };

  const paintSpin = (panel: Panel) => {
    panel.spin.setFillColor(panel.redline ? p.redlineColor : panel.spinRatio < p.spinLowRatio ? p.spinLowColor : p.spinColor);
    panel.detail.text = panel.redline ? (ctx.data.style.revGains.labels.redline ?? 'SPIN') : 'SPIN';
    panel.detail.style.fill = panel.redline ? p.redlineColor : p.detailColor;
  };

  return [
    on(RedlineChanged, 'rig.view.hudOnRedline', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const panel = panels.get(spinnerOfRig(batch.cols.rigId[i]));
        if (!panel) continue;
        panel.redline = batch.cols.active[i] === 1;
        paintSpin(panel);
      }
    }),
    on(SpinnerAssigned, 'rig.view.hudOnSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const slot = batch.cols.slot[i];
        const root = new Container();
        const back = new Graphics();
        const title = text(p.nameSize, p.textColor);
        const detail = text(p.detailSize, p.detailColor);
        const spinText = text(p.detailSize, p.detailColor);
        detail.text = 'SPIN';
        const spin = createGauge({ width: 100, height: p.gaugeHeight, backColor: p.gaugeBackColor, fillColor: p.spinColor, cornerRadius: p.cornerRadius }, slot % 2 === 1);
        const gate = new Graphics();
        root.addChild(back, title, detail, spinText, spin.view, gate);
        ctx.screens.layer('hud').addChild(root);
        panels.set(batch.cols.spinnerId[i], { slot, spinnerName: batch.cols.name[i], root, back, title, detail, spinText, spin, gate, width: 0, redline: false, spinRatio: 1 });
      }
      layout();
    }),
    on(RigReady, 'rig.view.hudOnRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const panel = panels.get(batch.cols.spinnerId[i]);
        if (!panel) continue;
        panel.title.text = `${panel.spinnerName} · ${batch.cols.name[i]}`;
        panel.title.style.fill = batch.cols.color[i];
        fitText(panel.title, panel.width);
      }
    }),
    on(RigSpinChanged, 'rig.view.hudOnSpinChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const panel = panels.get(spinnerOfRig(batch.cols.rigId[i]));
        if (!panel) continue;
        const ratio = batch.cols.spinRatio[i];
        panel.spinRatio = ratio;
        panel.spin.set(ratio);
        paintSpin(panel);
        panel.spinText.text = `${Math.max(0, Math.ceil(ratio * 100))}%`;
      }
    }),
    on(ViewportResized, 'rig.view.layoutHud', (batch) => {
      screenWidth = batch.cols.width[batch.count - 1];
      layout();
    }),
  ];
}
