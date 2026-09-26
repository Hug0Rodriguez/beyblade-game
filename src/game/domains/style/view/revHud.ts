import { PointerKindDetected } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { el } from '@engine/ui/dom/el';
import { createDomGauge, type DomGauge } from '@engine/ui/dom/gauge';
import { RoundStarted } from '../../../messages/roundMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import { RevChanged, ShatterReady } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { rigOfSpinner, spinnerOfRig } from '../../../shared/ids';
import { hudColumn } from '../../../gui/hudColumns';

interface RevBlock {
  readonly name: HTMLElement;
  readonly multiplier: HTMLElement;
  readonly bar: DomGauge;
  /** Spendable Rank pips. */
  readonly pips: HTMLElement[];
  rank: number;
}

/**
 * Style on screen (HTML): each Spinner's Rev Rank (name, ×multiplier, progress, spendable pips)
 * under their panel, and the Shatter prompt for the human Spinner. Callouts live in calloutsView.
 */
export function revHudHandlers(ctx: ViewContext): HandlerDef[] {
  const hud = ctx.data.hud.hud;
  const blocks = new Map<number, RevBlock>();
  const humanRigs = new Set<number>();
  let touch = false;

  const prompt = el('div', 'shatter-prompt gui-pulse');
  prompt.hidden = true;
  ctx.gui.layer('banner').appendChild(prompt);

  return [
    on(SpinnerAssigned, 'style.view.onSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const slot = batch.cols.slot[i];
        if (batch.cols.controller[i] === 'human') humanRigs.add(rigOfSpinner(batch.cols.spinnerId[i]));
        const root = el('div', 'rev-block');
        const head = el('div', 'rev-head');
        const name = el('span', 'rev-name');
        const multiplier = el('span', 'rev-multiplier');
        head.append(name, multiplier);
        const bar = createDomGauge(slot % 2 === 1);
        bar.set(0);
        bar.setFillColor(hud.panel.detailColor);
        const pipRow = el('div', 'pips rev-pips');
        const pips: HTMLElement[] = [];
        for (let pip = 0; pip < ctx.data.style.revRanks.ranks.length - 1; pip++) {
          const dot = el('i');
          pipRow.appendChild(dot);
          pips.push(dot);
        }
        root.append(head, bar.element, pipRow);
        hudColumn(ctx.gui.layer('hud'), slot).appendChild(root);
        blocks.set(batch.cols.spinnerId[i], { name, multiplier, bar, pips, rank: 0 });
      }
    }),
    on(RevChanged, 'style.view.onRevChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const block = blocks.get(spinnerOfRig(batch.cols.rigId[i]));
        if (!block) continue;
        const color = batch.cols.color[i];
        const rank = batch.cols.rank[i];
        block.name.textContent = batch.cols.rankName[i];
        block.name.style.color = color;
        block.multiplier.textContent = `×${batch.cols.multiplier[i].toFixed(1)}`;
        block.bar.set(batch.cols.progress[i]);
        block.bar.setFillColor(color);
        if (rank > block.rank) {
          block.name.classList.remove('pop');
          void block.name.offsetWidth;
          block.name.classList.add('pop');
        }
        block.rank = rank;
        block.pips.forEach((pip, index) => (pip.style.background = index < rank ? color : ''));
      }
    }),
    on(ShatterReady, 'style.view.onShatterReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (!humanRigs.has(batch.cols.rigId[i])) continue;
        prompt.hidden = batch.cols.ready[i] !== 1;
        prompt.textContent = touch ? ctx.data.screens.copy.shatterPromptTouch : ctx.data.screens.copy.shatterPromptKeyboard;
      }
    }),
    on(RoundStarted, 'style.view.onRoundStarted', () => {
      prompt.hidden = true;
    }),
    on(PointerKindDetected, 'style.view.onPointerKind', (batch) => {
      touch = batch.cols.touch[batch.count - 1] === 1;
    }),
  ];
}
