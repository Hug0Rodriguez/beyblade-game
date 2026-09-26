import { Container, Graphics, Text, type TextStyleFontWeight } from 'pixi.js';
import { FrameRendered, PointerKindDetected, ViewportResized } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { createGauge, type Gauge } from '@engine/ui/gauge';
import { GearChanged, RigBodiesMoved } from '../../../messages/brawlMessages';
import { RoundStarted } from '../../../messages/roundMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import { RedlineChanged, RevChanged, RevGained, ShatterReady } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';
import { panelRect, revBlockY } from '../../../shared/hudLayout';
import { rigOfSpinner, spinnerOfRig } from '../../../shared/ids';

interface RevBlock {
  readonly slot: number;
  readonly root: Container;
  readonly name: Text;
  readonly multiplier: Text;
  readonly bar: Gauge;
  /** Spendable Rank pips. */
  readonly pips: Graphics;
  rank: number;
  color: string;
  pop: number;
}

interface Callout {
  readonly text: Text;
  age: number;
  life: number;
  size: number;
}

/**
 * Style on screen: each Spinner's Rev Rank (name, ×multiplier, progress) under their panel,
 * trick callouts floating off the Rig, and the Shatter prompt for the human Spinner.
 */
export function revHudHandlers(ctx: ViewContext): HandlerDef[] {
  const hud = ctx.data.hud.hud;
  const fontWeight = hud.font.fontWeight as TextStyleFontWeight;
  const blocks = new Map<number, RevBlock>();
  const humanRigs = new Set<number>();
  const rigPositions = new Map<number, { x: number; y: number; z: number }>();
  let screenWidth = 0;
  let touch = false;
  let time = 0;

  const text = (size: number, fill: string, stroke?: string) =>
    new Text({
      text: '',
      style: { fontFamily: hud.font.fontFamily, fontWeight, fontSize: size, fill, ...(stroke ? { stroke: { color: stroke, width: 4, join: 'round' as const } } : {}) },
    });

  const calloutLayer = ctx.screens.layer('callouts');
  const callouts: Callout[] = [];
  for (let i = 0; i < hud.callout.capacity; i++) {
    const label = text(hud.callout.fontSize, '#ffffff', hud.callout.strokeColor);
    label.anchor.set(0.5);
    label.visible = false;
    calloutLayer.addChild(label);
    callouts.push({ text: label, age: 0, life: 0, size: 1 });
  }
  let nextCallout = 0;
  const lastGear = new Map<number, number>();

  const prompt = text(hud.shatterPrompt.fontSize, hud.shatterPrompt.color, hud.banner.strokeColor);
  prompt.anchor.set(0.5);
  prompt.visible = false;
  ctx.screens.layer('banner').addChild(prompt);

  const layout = () => {
    for (const block of blocks.values()) {
      const rect = panelRect(block.slot, screenWidth, hud);
      const right = rect.side === -1;
      block.root.position.set(rect.x, revBlockY(hud));
      block.name.anchor.set(right ? 1 : 0, 0);
      block.name.x = right ? rect.width : 0;
      block.multiplier.anchor.set(right ? 0 : 1, 0);
      block.multiplier.x = right ? 0 : rect.width;
      block.multiplier.y = (hud.rev.nameSize - hud.rev.multiplierSize) / 2;
      block.bar.resize(rect.width);
      block.bar.view.y = hud.rev.nameSize + hud.rev.gap;
      block.pips.position.set(right ? rect.width : 0, hud.rev.nameSize + hud.rev.gap * 2 + hud.rev.barHeight + hud.rev.pipRadius);
      block.pips.scale.x = right ? -1 : 1;
      drawPips(block);
    }
  };

  /** One pip per Rank above Wobble; filled up to the current Rank (what you can spend). */
  const drawPips = (block: RevBlock) => {
    const { pipRadius, pipGap, pipEmptyColor } = hud.rev;
    const spendable = ctx.data.style.revRanks.ranks.length - 1;
    block.pips.clear();
    for (let i = 0; i < spendable; i++) {
      block.pips.circle(pipRadius + i * pipGap, 0, pipRadius).fill({ color: i < block.rank ? block.color : pipEmptyColor });
    }
  };

  const spawnCallout = (rigId: number, label: string, color: string, size = 1) => {
    const at = rigPositions.get(rigId);
    if (!at || !label) return;
    const callout = callouts[nextCallout];
    nextCallout = (nextCallout + 1) % callouts.length;
    callout.text.text = label;
    callout.text.style.fill = color;
    callout.text.position.set(at.x, at.y - at.z * ctx.data.brawl.brawlFx.height.liftPerUnit - hud.callout.offsetY);
    callout.text.visible = true;
    callout.age = 0;
    callout.life = hud.callout.seconds;
    callout.size = size;
  };

  return [
    on(SpinnerAssigned, 'style.view.onSpinnerAssigned', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const slot = batch.cols.slot[i];
        if (batch.cols.controller[i] === 'human') humanRigs.add(rigOfSpinner(batch.cols.spinnerId[i]));
        const root = new Container();
        const name = text(hud.rev.nameSize, hud.panel.detailColor, hud.banner.strokeColor);
        const multiplier = text(hud.rev.multiplierSize, hud.panel.textColor);
        const bar = createGauge({ width: 100, height: hud.rev.barHeight, backColor: hud.rev.barBackColor, fillColor: hud.panel.detailColor, cornerRadius: 2 }, slot % 2 === 1);
        bar.set(0);
        const pips = new Graphics();
        root.addChild(name, multiplier, bar.view, pips);
        ctx.screens.layer('hud').addChild(root);
        blocks.set(batch.cols.spinnerId[i], { slot, root, name, multiplier, bar, pips, rank: 0, color: hud.panel.detailColor, pop: 0 });
      }
      layout();
    }),
    on(RevChanged, 'style.view.onRevChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const block = blocks.get(spinnerOfRig(batch.cols.rigId[i]));
        if (!block) continue;
        const color = batch.cols.color[i];
        block.name.text = batch.cols.rankName[i];
        block.name.style.fill = color;
        block.multiplier.text = `×${batch.cols.multiplier[i].toFixed(1)}`;
        block.bar.set(batch.cols.progress[i]);
        block.bar.setFillColor(color);
        const rank = batch.cols.rank[i];
        if (rank > block.rank) {
          block.pop = hud.rev.rankUpSeconds;
          spawnCallout(batch.cols.rigId[i], `${batch.cols.rankName[i]}!`, color);
        }
        block.rank = rank;
        block.color = color;
        drawPips(block);
      }
    }),
    // Gains in white, won reads big and gold, losses red ("COUNTERED", "−REV"), repeats grey "STALE".
    on(RevGained, 'style.view.onRevGained', (batch) => {
      const labels = ctx.data.style.revGains.labels;
      const look = hud.callout;
      for (let i = 0; i < batch.count; i++) {
        const reason = batch.cols.reason[i];
        const label = labels[reason];
        if (!label) continue;
        if (look.spendReasons.includes(reason)) spawnCallout(batch.cols.rigId[i], label, look.spendColor, look.bigScale);
        else if (batch.cols.amount[i] < 0) spawnCallout(batch.cols.rigId[i], label, look.lossColor);
        else if (batch.cols.stale[i] === 1) spawnCallout(batch.cols.rigId[i], `${label} · ${labels.stale ?? ''}`, look.staleColor);
        else if (look.bigHits.includes(reason)) spawnCallout(batch.cols.rigId[i], label, look.bigColor, look.bigScale);
        else spawnCallout(batch.cols.rigId[i], label, look.gainColor);
      }
    }),
    // Reaching the top Gear is worth a shout (on the way up only): the rival should see the cash-in coming.
    on(GearChanged, 'style.view.onGearChanged', (batch) => {
      const gears = ctx.data.brawl.gears;
      for (let i = 0; i < batch.count; i++) {
        const rigId = batch.cols.rigId[i];
        const gear = batch.cols.gear[i];
        const rising = gear > (lastGear.get(rigId) ?? 0);
        lastGear.set(rigId, gear);
        if (rising && gear === gears.gears.length - 1) spawnCallout(rigId, gears.look.maxGearCallout, gears.gears[gear].color || hud.callout.gainColor);
      }
    }),
    on(RedlineChanged, 'style.view.onRedlineChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.active[i] === 1) spawnCallout(batch.cols.rigId[i], ctx.data.style.revGains.labels.redline ?? '', hud.callout.redlineColor, hud.callout.bigScale);
      }
    }),
    on(ShatterReady, 'style.view.onShatterReady', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (!humanRigs.has(batch.cols.rigId[i])) continue;
        prompt.visible = batch.cols.ready[i] === 1;
        prompt.text = touch ? ctx.data.screens.copy.shatterPromptTouch : ctx.data.screens.copy.shatterPromptKeyboard;
      }
    }),
    on(RoundStarted, 'style.view.onRoundStarted', () => {
      prompt.visible = false;
      for (const callout of callouts) callout.text.visible = false;
    }),
    on(RigBodiesMoved, 'style.view.trackBodies', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        rigPositions.set(batch.cols.rigId[i], { x: batch.cols.x[i], y: batch.cols.y[i], z: batch.cols.z[i] });
      }
    }),
    on(PointerKindDetected, 'style.view.onPointerKind', (batch) => {
      touch = batch.cols.touch[batch.count - 1] === 1;
    }),
    on(ViewportResized, 'style.view.layout', (batch) => {
      screenWidth = batch.cols.width[batch.count - 1];
      prompt.position.set(screenWidth / 2, batch.cols.height[batch.count - 1] * hud.shatterPrompt.yRatio);
      layout();
    }),
    on(FrameRendered, 'style.view.animate', (batch) => {
      const dt = batch.cols.frameDt[batch.count - 1];
      time += dt;
      for (const callout of callouts) {
        if (!callout.text.visible) continue;
        callout.age += dt;
        callout.text.y -= hud.callout.riseSpeed * dt;
        callout.text.alpha = Math.max(0, 1 - callout.age / callout.life);
        callout.text.scale.set(callout.size * (1 + Math.max(0, 0.25 - callout.age) * 2));
        if (callout.age >= callout.life) callout.text.visible = false;
      }
      for (const block of blocks.values()) {
        block.pop = Math.max(0, block.pop - dt);
        block.name.scale.set(1 + (block.pop / hud.rev.rankUpSeconds) * 0.5);
      }
      if (prompt.visible) prompt.alpha = 0.6 + 0.4 * Math.abs(Math.sin(time * hud.shatterPrompt.pulsePerSecond));
    }),
  ];
}
