import { createSynth } from '@engine/audio/synth';
import { on } from '@engine/messaging/handlerRegistry';
import { el } from '@engine/ui/dom/el';
import { HitLanded } from '../messages/brawlMessages';
import { PointsAwarded } from '../messages/matchMessages';
import { MoveRefused, MoveStarted } from '../messages/moveMessages';
import { CountdownBeat, RoundFinished } from '../messages/roundMessages';
import { RevChanged, ShatterReady } from '../messages/styleMessages';
import type { DomainModule } from '../shared/domainContext';

/**
 * Sound for weight (data/game/audio/sounds.json): every move start, every hit (louder with its
 * shake), the countdown, points, Rank-ups, the Shatter prompt, refused presses. Procedural, so
 * there are no sound files. A speaker button in the HUD and the mute key toggle it.
 */
export const audioView: DomainModule<null> = {
  name: 'audio',
  createState: () => null,
  createHandlers: () => [],
  createViewHandlers: (ctx) => {
    const audio = ctx.data.audio.sounds;
    const cues = audio.cues;
    const remembered = readMuted(audio.mute.storageKey);
    const synth = createSynth(audio.recipes, audio.master.gain, remembered);
    const ranks = new Map<number, number>();

    const button = el('button', 'mute-button');
    button.type = 'button';
    const paint = () => (button.textContent = synth.isMuted() ? audio.mute.mutedLabel : audio.mute.label);
    const toggle = () => {
      synth.setMuted(!synth.isMuted());
      writeMuted(audio.mute.storageKey, synth.isMuted());
      paint();
    };
    button.addEventListener('click', toggle);
    window.addEventListener('keydown', (event) => {
      if (event.code === audio.mute.key && !event.repeat) toggle();
    });
    paint();
    ctx.gui.root.appendChild(button);
    /** Plays and notes the cue on the button (`data-last`), so a phone can be checked without a console. */
    const play = (recipe: string, options?: { gain?: number; pitch?: number }) => {
      synth.play(recipe, options);
      button.dataset.last = synth.lastPlayed();
    };

    return [
      on(MoveStarted, 'audio.onMoveStarted', (batch) => {
        for (let i = 0; i < batch.count; i++) {
          const recipe = cues.moves[batch.cols.move[i]];
          if (recipe) play(recipe);
        }
      }),
      on(HitLanded, 'audio.onHitLanded', (batch) => {
        for (let i = 0; i < batch.count; i++) {
          const hit = batch.cols.hit[i];
          const recipe = cues.hits[hit];
          if (!recipe) continue;
          const shake = ctx.data.brawl.hits[hit]?.shake ?? 0;
          play(recipe, { gain: 1 + shake * cues.hitGainPerShake });
        }
      }),
      on(CountdownBeat, 'audio.onCountdownBeat', (batch) => {
        const i = batch.count - 1;
        play(batch.cols.go[i] === 1 ? cues.countdownGo : cues.countdownBeat);
      }),
      on(RoundFinished, 'audio.onRoundFinished', () => play(cues.roundFinished)),
      on(PointsAwarded, 'audio.onPointsAwarded', () => play(cues.pointsAwarded)),
      on(RevChanged, 'audio.onRevChanged', (batch) => {
        for (let i = 0; i < batch.count; i++) {
          const rigId = batch.cols.rigId[i];
          const rank = batch.cols.rank[i];
          if (rank > (ranks.get(rigId) ?? 0)) play(cues.rankUp, { pitch: 1 + rank * 0.08 });
          ranks.set(rigId, rank);
        }
      }),
      on(ShatterReady, 'audio.onShatterReady', (batch) => {
        for (let i = 0; i < batch.count; i++) if (batch.cols.ready[i] === 1) play(cues.shatterReady);
      }),
      on(MoveRefused, 'audio.onMoveRefused', () => play(cues.refused)),
    ];
  },
};

function readMuted(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeMuted(key: string, muted: boolean): void {
  try {
    localStorage.setItem(key, muted ? '1' : '0');
  } catch {
    /* private mode: the choice just isn't remembered */
  }
}
