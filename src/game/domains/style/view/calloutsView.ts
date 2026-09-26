import { Text, type TextStyleFontWeight } from 'pixi.js';
import { FrameRendered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { GearChanged, RigBodiesMoved } from '../../../messages/brawlMessages';
import { RoundStarted } from '../../../messages/roundMessages';
import { RedlineChanged, RevChanged, RevGained } from '../../../messages/styleMessages';
import type { ViewContext } from '../../../shared/domainContext';

interface Callout {
  readonly text: Text;
  age: number;
  life: number;
  size: number;
}

/** Trick callouts floating off the Rig in world space (Pixi): Rank-ups, hits, spends, Redline. */
export function calloutsViewHandlers(ctx: ViewContext): HandlerDef[] {
  const hud = ctx.data.hud.hud;
  const fontWeight = hud.font.fontWeight as TextStyleFontWeight;
  const rigPositions = new Map<number, { x: number; y: number; z: number }>();
  const ranks = new Map<number, number>();
  const lastGear = new Map<number, number>();

  const calloutLayer = ctx.screens.layer('callouts');
  const callouts: Callout[] = [];
  for (let i = 0; i < hud.callout.capacity; i++) {
    const label = new Text({
      text: '',
      style: { fontFamily: hud.font.fontFamily, fontWeight, fontSize: hud.callout.fontSize, fill: '#ffffff', stroke: { color: hud.callout.strokeColor, width: 4, join: 'round' } },
    });
    label.anchor.set(0.5);
    label.visible = false;
    calloutLayer.addChild(label);
    callouts.push({ text: label, age: 0, life: 0, size: 1 });
  }
  let nextCallout = 0;

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
    on(RevChanged, 'style.callouts.onRevChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        const rigId = batch.cols.rigId[i];
        const rank = batch.cols.rank[i];
        if (rank > (ranks.get(rigId) ?? 0)) spawnCallout(rigId, `${batch.cols.rankName[i]}!`, batch.cols.color[i]);
        ranks.set(rigId, rank);
      }
    }),
    // Gains in white, won reads big and gold, losses red ("COUNTERED", "−REV"), repeats grey "STALE".
    on(RevGained, 'style.callouts.onRevGained', (batch) => {
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
    on(GearChanged, 'style.callouts.onGearChanged', (batch) => {
      const gears = ctx.data.brawl.gears;
      for (let i = 0; i < batch.count; i++) {
        const rigId = batch.cols.rigId[i];
        const gear = batch.cols.gear[i];
        const rising = gear > (lastGear.get(rigId) ?? 0);
        lastGear.set(rigId, gear);
        if (rising && gear === gears.gears.length - 1) spawnCallout(rigId, gears.look.maxGearCallout, gears.gears[gear].color || hud.callout.gainColor);
      }
    }),
    on(RedlineChanged, 'style.callouts.onRedlineChanged', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        if (batch.cols.active[i] === 1) spawnCallout(batch.cols.rigId[i], ctx.data.style.revGains.labels.redline ?? '', hud.callout.redlineColor, hud.callout.bigScale);
      }
    }),
    on(RoundStarted, 'style.callouts.onRoundStarted', () => {
      for (const callout of callouts) callout.text.visible = false;
    }),
    on(RigBodiesMoved, 'style.callouts.trackBodies', (batch) => {
      for (let i = 0; i < batch.count; i++) {
        rigPositions.set(batch.cols.rigId[i], { x: batch.cols.x[i], y: batch.cols.y[i], z: batch.cols.z[i] });
      }
    }),
    on(FrameRendered, 'style.callouts.animate', (batch) => {
      const dt = batch.cols.frameDt[batch.count - 1];
      for (const callout of callouts) {
        if (!callout.text.visible) continue;
        callout.age += dt;
        callout.text.y -= hud.callout.riseSpeed * dt;
        callout.text.alpha = Math.max(0, 1 - callout.age / callout.life);
        callout.text.scale.set(callout.size * (1 + Math.max(0, 0.25 - callout.age) * 2));
        if (callout.age >= callout.life) callout.text.visible = false;
      }
    }),
  ];
}
