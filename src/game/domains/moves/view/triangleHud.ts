import { PointerKindDetected, StateEntered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { el } from '@engine/ui/dom/el';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { rigOfSpinner } from '../../../shared/ids';
import { hudColumn } from '../../../gui/hudColumns';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * The triangle on screen (HTML/SVG), under the human's panel: DASH › HOOK › WHIRL › DASH with
 * DIVE underneath, key letters for keyboard players. The rival's current move lights its node
 * and the arrow to its answer pulses, so the read is recognised, not recalled.
 */
export function triangleHudHandlers(ctx: ViewContext): HandlerDef[] {
  const glyphs = ctx.data.moves.moveGlyphs;
  const bindings = ctx.data.spinner.keyboard.bindings;
  const humanRigs = new Set<number>();
  const nodes = new Map<string, SVGGElement>();
  const arrows = new Map<string, SVGPathElement>();
  const keys = new Map<string, SVGTextElement>();

  const root = el('div', 'triangle-hud');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 120 112');
  root.appendChild(svg);

  const node = (name: string, cx: number, cy: number, key: string) => {
    const glyph = glyphs.glyphs[name];
    const group = document.createElementNS(SVG, 'g');
    group.classList.add('tri-node');
    group.setAttribute('transform', `translate(${cx - 12} ${cy - 12})`);
    group.style.setProperty('--glyph-color', glyph.color);
    const halo = document.createElementNS(SVG, 'circle');
    halo.setAttribute('cx', '12');
    halo.setAttribute('cy', '12');
    halo.setAttribute('r', '15');
    halo.classList.add('tri-halo');
    const shape = document.createElementNS(SVG, 'path');
    shape.setAttribute('d', glyph.path);
    const label = document.createElementNS(SVG, 'text');
    label.setAttribute('x', '12');
    label.setAttribute('y', '34');
    label.classList.add('tri-key');
    label.textContent = key;
    group.append(halo, shape, label);
    svg.appendChild(group);
    nodes.set(name, group);
    keys.set(name, label);
  };
  /** A line from (x1, y1) to (x2, y2) with a chevron head: "this beats that". */
  const arrowPath = (x1: number, y1: number, x2: number, y2: number) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = (turn: number) => `L${(x2 - Math.cos(angle + turn) * 7).toFixed(1)} ${(y2 - Math.sin(angle + turn) * 7).toFixed(1)}`;
    return `M${x1} ${y1} L${x2} ${y2} ${head(0.5)} M${x2} ${y2} ${head(-0.5)}`;
  };
  const arrow = (from: string, to: string, d: string) => {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    path.classList.add('tri-arrow');
    svg.appendChild(path);
    arrows.set(`${from}>${to}`, path);
  };
  const keyOf = (command: string) => (bindings[command as keyof typeof bindings]?.[0] ?? '').replace('Key', '');

  // Layout: three vertices of the triangle (top, bottom-right, bottom-left) and DIVE below.
  const [a, b, c] = glyphs.triangle;
  arrow(a, b, arrowPath(72, 28, 88, 50));
  arrow(b, c, arrowPath(82, 80, 38, 80));
  arrow(c, a, arrowPath(32, 50, 48, 28));
  node(a, 60, 18, keyOf(a));
  node(b, 98, 66, keyOf(b));
  node(c, 22, 66, keyOf(c));
  node('dive', 60, 96, keyOf('pop'));

  const light = (rivalMove: string) => {
    const rivalGlyph = Object.values(glyphs.glyphs).find((glyph) => glyph.moves.includes(rivalMove));
    const rivalName = Object.keys(glyphs.glyphs).find((name) => glyphs.glyphs[name] === rivalGlyph);
    const vulnerable = ctx.data.moves.moveTuning.vulnerableStates.includes(rivalMove);
    const sees = vulnerable ? 'vulnerable' : rivalGlyph?.role;
    const sign = sees ? glyphs.counters.find((counter) => counter.sees === sees) : undefined;
    for (const [name, group] of nodes) {
      group.classList.toggle('active', !vulnerable && name === rivalName);
      group.classList.toggle('answer', sign?.answer === name);
    }
    for (const [key, path] of arrows) path.classList.toggle('answer', sign !== undefined && key === `${sign.answer}>${rivalName}`);
    root.classList.toggle('vulnerable', vulnerable);
  };

  return [
    on(SpinnerAssigned, 'moves.view.onSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.controller[i] !== 'human') continue;
        humanRigs.add(rigOfSpinner(batch.cols.spinnerId[i]));
        hudColumn(ctx.gui.layer('hud'), batch.cols.slot[i]).appendChild(root);
      }
    }),
    on(StateEntered, 'moves.view.onMoveState', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.fsm[i] === ctx.data.moves.moveTuning.fsm && !humanRigs.has(batch.cols.instance[i])) light(batch.cols.state[i]);
      }
    }),
    on(PointerKindDetected, 'moves.view.onPointerKind', (batch) => {
      if (batch.cols.touch[batch.count - 1] === 1) for (const label of keys.values()) label.textContent = '';
    }),
  ];
}
