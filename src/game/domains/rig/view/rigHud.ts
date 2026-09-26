import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { el } from '@engine/ui/dom/el';
import { createDomGauge, type DomGauge } from '@engine/ui/dom/gauge';
import { RigReady, RigSpinChanged } from '../../../messages/rigMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import { RedlineChanged } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { spinnerOfRig } from '../../../shared/ids';
import { hudColumn } from '../../../gui/hudColumns';

interface Panel {
  readonly spinnerName: string;
  readonly title: HTMLElement;
  readonly detail: HTMLElement;
  readonly spinText: HTMLElement;
  readonly spin: DomGauge;
  /** In Redline: the Spin bar and its label turn red. */
  redline: boolean;
  spinRatio: number;
}

/** One HUD panel per Spinner (HTML): "NAME · RIG", Spin bar (with the Shatter-gate tick; red in Redline) and Spin %. */
export function rigHudHandlers(ctx: ViewContext): HandlerDef[] {
  const hud = ctx.data.hud.hud;
  const p = hud.panel;
  const panels = new Map<number, Panel>();
  const layer = ctx.gui.layer('hud');

  const paintSpin = (panel: Panel) => {
    panel.spin.setFillColor(panel.redline ? p.redlineColor : panel.spinRatio < p.spinLowRatio ? p.spinLowColor : p.spinColor);
    panel.detail.textContent = panel.redline ? (ctx.data.style.revGains.labels.redline ?? 'SPIN') : 'SPIN';
    panel.detail.classList.toggle('redline', panel.redline);
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
        const root = el('div', 'rig-panel');
        const title = el('div', 'rig-title');
        const row = el('div', 'rig-row');
        const detail = el('span', 'rig-detail', 'SPIN');
        const spinText = el('span', 'rig-spin');
        row.append(detail, spinText);
        const spin = createDomGauge(slot % 2 === 1);
        spin.setFillColor(p.spinColor);
        const gateRatio = ctx.data.style.revRules.shatterRivalSpinRatio;
        const gate = el('i', 'gauge-gate');
        gate.style[slot % 2 === 1 ? 'right' : 'left'] = `calc(${gateRatio * 100}% - 1px)`;
        spin.element.appendChild(gate);
        root.append(title, row, spin.element);
        hudColumn(layer, slot).appendChild(root);
        panels.set(batch.cols.spinnerId[i], { spinnerName: batch.cols.name[i], title, detail, spinText, spin, redline: false, spinRatio: 1 });
      }
    }),
    on(RigReady, 'rig.view.hudOnRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const panel = panels.get(batch.cols.spinnerId[i]);
        if (!panel) continue;
        panel.title.textContent = `${panel.spinnerName} · ${batch.cols.name[i]}`;
        panel.title.style.color = batch.cols.color[i];
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
        panel.spinText.textContent = `${Math.max(0, Math.ceil(ratio * 100))}%`;
      }
    }),
  ];
}
