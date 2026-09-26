/** One voice of a sound: a swept tone or filtered noise with an attack/decay envelope. */
export interface Voice {
  readonly kind: 'tone' | 'noise';
  readonly seconds: number;
  readonly gain: number;
  readonly wave?: OscillatorType;
  readonly freqFrom?: number;
  readonly freqTo?: number;
  readonly lowpassFrom?: number;
  readonly lowpassTo?: number;
  readonly attack?: number;
}

export type SoundRecipe = readonly Voice[];

export interface PlayOptions {
  /** Multiplies the recipe's gain (a heavy hit plays louder). */
  readonly gain?: number;
  /** Multiplies every tone frequency. */
  readonly pitch?: number;
}

export interface Synth {
  play(recipe: string, options?: PlayOptions): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** Name of the last recipe played (for the debug readout). */
  lastPlayed(): string;
}

/**
 * Procedural Web Audio: no sound files. The context is created on the first user gesture
 * (browsers, iOS especially, refuse sound before one). Recipes are data (sounds.json).
 */
export function createSynth(recipes: Readonly<Record<string, SoundRecipe>>, masterGain: number, muted = false): Synth {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let noiseBuffer: AudioBuffer | undefined;
  let last = '-';

  const ensure = () => {
    if (context) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    context = new Ctx();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 8;
    limiter.connect(context.destination);
    master = context.createGain();
    master.gain.value = muted ? 0 : masterGain;
    master.connect(limiter);
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  };
  const unlock = () => {
    ensure();
    void context?.resume();
  };
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(type, unlock, { passive: true });

  const voice = (spec: Voice, options: PlayOptions) => {
    if (!context || !master || !noiseBuffer) return;
    const now = context.currentTime;
    const end = now + spec.seconds;
    const pitch = options.pitch ?? 1;
    const envelope = context.createGain();
    const peak = Math.max(0.0001, spec.gain * (options.gain ?? 1));
    const attack = spec.attack ?? 0.005;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(peak, now + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    envelope.connect(master);
    let source: AudioScheduledSourceNode;
    if (spec.kind === 'tone') {
      const osc = context.createOscillator();
      osc.type = spec.wave ?? 'sine';
      osc.frequency.setValueAtTime((spec.freqFrom ?? 220) * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, (spec.freqTo ?? spec.freqFrom ?? 220) * pitch), end);
      source = osc;
    } else {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      source = noise;
    }
    if (spec.lowpassFrom !== undefined) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(spec.lowpassFrom, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, spec.lowpassTo ?? spec.lowpassFrom), end);
      source.connect(filter);
      filter.connect(envelope);
    } else {
      source.connect(envelope);
    }
    source.start(now);
    source.stop(end + 0.05);
  };

  return {
    play(name, options = {}) {
      const recipe = recipes[name];
      if (!recipe || !context || context.state !== 'running' || muted) return;
      last = name;
      for (const spec of recipe) voice(spec, options);
    },
    setMuted(next) {
      muted = next;
      if (master) master.gain.value = next ? 0 : masterGain;
    },
    isMuted: () => muted,
    lastPlayed: () => last,
  };
}
