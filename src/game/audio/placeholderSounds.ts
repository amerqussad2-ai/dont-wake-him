/**
 * TEMPORARY PLACEHOLDER AUDIO.
 *
 * Every sound in the game is synthesised here with the Web Audio API, so the
 * audio system can be tested end to end without asset files. All of it is
 * original and generated in code (no samples, no third-party music).
 *
 * To ship real audio, replace a recipe in `soundBank.ts` with a sample-based
 * one; nothing outside the audio folder needs to change.
 */

export interface SynthKit {
  ctx: AudioContext;
  /** A few seconds of white noise, shared by all recipes. */
  noise: AudioBuffer;
}

export interface PlayParams {
  /** Extra gain multiplier (0..1+). */
  volume?: number;
  /** Pitch multiplier, 1 = default. */
  pitch?: number;
  /** -1 (left) .. 1 (right). */
  pan?: number;
  /** Generic 0..1 strength (speed, danger, ...). */
  intensity?: number;
  /** Length hint in seconds, for breaths. */
  duration?: number;
  /** Index for sounds with variations (e.g. objective number). */
  step?: number;
}

/** A one-shot recipe schedules nodes at `t` and returns its length in seconds. */
export type OneShotRecipe = (kit: SynthKit, out: AudioNode, t: number, p: PlayParams) => number;

/** A loop recipe starts nodes and returns a function that stops them at a given time. */
export type LoopRecipe = (kit: SynthKit, out: AudioNode) => (when: number) => void;

// --- Building blocks ------------------------------------------------------

interface EnvOptions {
  attack?: number;
  peak?: number;
}

/** Gain node with a fast attack and an exponential decay to silence. */
function envelope(kit: SynthKit, out: AudioNode, t: number, decay: number, o: EnvOptions = {}): GainNode {
  const { attack = 0.005, peak = 0.5 } = o;
  const g = kit.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

interface ToneOptions extends EnvOptions {
  endFreq?: number;
  filter?: number;
}

function tone(
  kit: SynthKit,
  out: AudioNode,
  t: number,
  type: OscillatorType,
  freq: number,
  decay: number,
  o: ToneOptions = {},
): void {
  const osc = kit.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (o.endFreq) osc.frequency.exponentialRampToValueAtTime(o.endFreq, t + (o.attack ?? 0.005) + decay);
  const env = envelope(kit, out, t, decay, o);
  if (o.filter) {
    const lp = kit.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.filter;
    osc.connect(lp).connect(env);
  } else {
    osc.connect(env);
  }
  osc.start(t);
  osc.stop(t + (o.attack ?? 0.005) + decay + 0.05);
}

interface NoiseOptions extends EnvOptions {
  type?: BiquadFilterType;
  freq?: number;
  endFreq?: number;
  q?: number;
}

function noise(kit: SynthKit, out: AudioNode, t: number, decay: number, o: NoiseOptions = {}): void {
  const src = kit.ctx.createBufferSource();
  src.buffer = kit.noise;
  const filter = kit.ctx.createBiquadFilter();
  filter.type = o.type ?? "lowpass";
  filter.frequency.setValueAtTime(o.freq ?? 1000, t);
  if (o.endFreq) filter.frequency.exponentialRampToValueAtTime(o.endFreq, t + (o.attack ?? 0.005) + decay);
  filter.Q.value = o.q ?? 0.7;
  src.connect(filter).connect(envelope(kit, out, t, decay, o));
  const length = (o.attack ?? 0.005) + decay + 0.05;
  // Random offset so repeated bursts do not sound identical.
  src.start(t, Math.random() * Math.max(0, kit.noise.duration - length));
  src.stop(t + length);
}

const jitter = (amount: number) => 1 + (Math.random() * 2 - 1) * amount;

// --- Movement -------------------------------------------------------------

export const footstep: OneShotRecipe = (kit, out, t, p) => {
  const k = p.intensity ?? 1;
  const pitch = (p.pitch ?? 1) * jitter(0.08);
  noise(kit, out, t, 0.07, { freq: 750 * pitch, peak: 0.45 * k });
  tone(kit, out, t, "sine", 105 * pitch, 0.06, { endFreq: 55, peak: 0.35 * k });
  return 0.12;
};

export const footstepSneak: OneShotRecipe = (kit, out, t, p) => {
  const pitch = (p.pitch ?? 1) * jitter(0.1);
  noise(kit, out, t, 0.08, { freq: 380 * pitch, attack: 0.02, peak: 0.13 });
  tone(kit, out, t, "sine", 75 * pitch, 0.05, { attack: 0.01, peak: 0.05 });
  return 0.12;
};

export const bump: OneShotRecipe = (kit, out, t) => {
  tone(kit, out, t, "sine", 90, 0.22, { endFreq: 42, peak: 0.9 });
  noise(kit, out, t, 0.12, { freq: 520, peak: 0.5 });
  tone(kit, out, t, "triangle", 230, 0.08, { endFreq: 160, peak: 0.3 });
  return 0.3;
};

// --- Objects --------------------------------------------------------------

export const keyPickup: OneShotRecipe = (kit, out, t) => {
  [2350, 3120, 2780].forEach((f, i) => {
    const at = t + i * 0.045;
    tone(kit, out, at, "sine", f * jitter(0.02), 0.25, { peak: 0.16 });
    tone(kit, out, at, "triangle", f * 1.51, 0.1, { peak: 0.05 });
  });
  noise(kit, out, t, 0.05, { type: "highpass", freq: 5000, peak: 0.08 });
  return 0.4;
};

export const drawerOpen: OneShotRecipe = (kit, out, t) => {
  // Wood sliding: a swept band of noise with little catches along the way.
  noise(kit, out, t, 0.42, { type: "bandpass", freq: 320, endFreq: 1100, q: 3, attack: 0.06, peak: 0.45 });
  for (let i = 0; i < 6; i++) {
    noise(kit, out, t + 0.04 + i * 0.06 + Math.random() * 0.03, 0.015, {
      type: "highpass",
      freq: 1800,
      peak: 0.12,
    });
  }
  tone(kit, out, t + 0.44, "sine", 130, 0.12, { endFreq: 70, peak: 0.5 });
  noise(kit, out, t + 0.44, 0.06, { freq: 600, peak: 0.25 });
  return 0.65;
};

export const alarmSwitch: OneShotRecipe = (kit, out, t) => {
  tone(kit, out, t, "square", 1400, 0.02, { peak: 0.12, filter: 4000 });
  tone(kit, out, t + 0.012, "sine", 320, 0.05, { peak: 0.3 });
  return 0.1;
};

export const alarmTick: OneShotRecipe = (kit, out, t, p) => {
  const pitch = p.pitch ?? 1;
  noise(kit, out, t, 0.012, { type: "highpass", freq: 3500 * pitch, peak: 0.25 });
  tone(kit, out, t, "sine", 2100 * pitch, 0.02, { peak: 0.07 });
  return 0.05;
};

export const alarmBeep: OneShotRecipe = (kit, out, t, p) => {
  const pitch = p.pitch ?? 1;
  tone(kit, out, t, "triangle", 1760 * pitch, 0.06, { peak: 0.12 });
  tone(kit, out, t + 0.1, "triangle", 1760 * pitch, 0.06, { peak: 0.12 });
  return 0.2;
};

export const alarmRing: OneShotRecipe = (kit, out, t) => {
  // Classic double bell: the clapper alternates between two tones, in bursts.
  const bursts = 6;
  for (let b = 0; b < bursts; b++) {
    const start = t + b * 0.42;
    const osc = kit.ctx.createOscillator();
    osc.type = "triangle";
    for (let i = 0; i < 11; i++) osc.frequency.setValueAtTime(i % 2 ? 2093 : 1568, start + i * 0.03);
    const g = kit.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.35, start + 0.005);
    g.gain.setValueAtTime(0.35, start + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
    osc.connect(g).connect(out);
    osc.start(start);
    osc.stop(start + 0.36);
  }
  return bursts * 0.42;
};

// --- Sleeper --------------------------------------------------------------

export const snore: OneShotRecipe = (kit, out, t, p) => {
  const d = p.duration ?? 1.6;
  const ctx = kit.ctx;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(58 * jitter(0.05), t);
  osc.frequency.linearRampToValueAtTime(66, t + d);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 260;
  lp.Q.value = 4;
  // Rattle: amplitude modulation at ~28 Hz.
  const rattle = ctx.createGain();
  rattle.gain.value = 0.5;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 26 * jitter(0.1);
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.5;
  lfo.connect(lfoDepth).connect(rattle.gain);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.14, t + d * 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osc.connect(lp).connect(rattle).connect(env).connect(out);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + d + 0.05);
  lfo.stop(t + d + 0.05);
  noise(kit, out, t, d * 0.5, { type: "bandpass", freq: 700, attack: d * 0.5, peak: 0.03 });
  return d;
};

export const breathIn: OneShotRecipe = (kit, out, t, p) => {
  const d = p.duration ?? 1.2;
  noise(kit, out, t, d * 0.4, { type: "bandpass", freq: 900, endFreq: 1400, q: 1.2, attack: d * 0.6, peak: 0.05 * (p.volume ?? 1) });
  return d;
};

export const breathOut: OneShotRecipe = (kit, out, t, p) => {
  const d = p.duration ?? 1.2;
  noise(kit, out, t, d * 0.8, { freq: 800, endFreq: 350, attack: d * 0.15, peak: 0.06 * (p.volume ?? 1) });
  return d;
};

/** "mm…" — a sleepy hum. */
export const murmur: OneShotRecipe = (kit, out, t) => {
  const ctx = kit.ctx;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(170, t);
  osc.frequency.exponentialRampToValueAtTime(138, t + 0.5);
  const vib = ctx.createOscillator();
  vib.frequency.value = 6;
  const vibDepth = ctx.createGain();
  vibDepth.gain.value = 4;
  vib.connect(vibDepth).connect(osc.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  osc.connect(lp).connect(envelope(kit, out, t, 0.45, { attack: 0.08, peak: 0.22 }));
  osc.start(t);
  vib.start(t);
  osc.stop(t + 0.6);
  vib.stop(t + 0.6);
  return 0.6;
};

/** "hm?!" — a sharper, rising grunt. */
export const grumble: OneShotRecipe = (kit, out, t) => {
  tone(kit, out, t, "sawtooth", 150, 0.28, { endFreq: 260, attack: 0.04, peak: 0.2, filter: 750 });
  tone(kit, out, t + 0.3, "sawtooth", 235, 0.14, { endFreq: 200, peak: 0.14, filter: 700 });
  return 0.5;
};

export const rustle: OneShotRecipe = (kit, out, t, p) => {
  noise(kit, out, t, 0.22, { type: "bandpass", freq: 2400 * jitter(0.2), q: 0.8, attack: 0.06, peak: 0.1 * (p.volume ?? 1) });
  return 0.3;
};

// --- Wake-up sequence (each beat is triggered by its animation) -----------

export const wakeGasp: OneShotRecipe = (kit, out, t) => {
  noise(kit, out, t, 0.12, { type: "bandpass", freq: 600, endFreq: 2400, q: 2, attack: 0.18, peak: 0.28 });
  return 0.35;
};

export const wakeSting: OneShotRecipe = (kit, out, t) => {
  // Low cluster plus a clashing minor second: original, deliberately unpleasant.
  for (const f of [55, 58.3, 82.4]) tone(kit, out, t, "sawtooth", f, 1.4, { attack: 0.01, peak: 0.16, filter: 900 });
  for (const f of [466, 494]) tone(kit, out, t, "sine", f, 1.1, { attack: 0.01, peak: 0.1 });
  tone(kit, out, t, "sine", 1760, 0.9, { endFreq: 1450, peak: 0.06 });
  return 1.5;
};

export const bedCreak: OneShotRecipe = (kit, out, t) => {
  const ctx = kit.ctx;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(170, t);
  osc.frequency.linearRampToValueAtTime(250, t + 0.18);
  osc.frequency.linearRampToValueAtTime(160, t + 0.4);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 950;
  bp.Q.value = 8;
  osc.connect(bp).connect(envelope(kit, out, t, 0.32, { attack: 0.06, peak: 0.3 }));
  osc.start(t);
  osc.stop(t + 0.45);
  noise(kit, out, t, 0.3, { type: "bandpass", freq: 2200, q: 0.8, attack: 0.05, peak: 0.12 });
  return 0.45;
};

export const wakeHit: OneShotRecipe = (kit, out, t) => {
  tone(kit, out, t, "sine", 65, 0.8, { endFreq: 32, peak: 0.9 });
  noise(kit, out, t, 0.3, { freq: 220, peak: 0.4 });
  return 0.9;
};

// --- Feedback & UI --------------------------------------------------------

export const heartbeat: OneShotRecipe = (kit, out, t, p) => {
  const k = p.intensity ?? 1;
  tone(kit, out, t, "sine", 58, 0.12, { endFreq: 40, peak: 0.55 * k });
  tone(kit, out, t + 0.17, "sine", 52, 0.14, { endFreq: 38, peak: 0.4 * k });
  return 0.4;
};

export const objectiveChime: OneShotRecipe = (kit, out, t, p) => {
  const base = [523.25, 587.33, 659.25][Math.min(p.step ?? 0, 2)];
  tone(kit, out, t, "sine", base, 0.6, { peak: 0.18 });
  tone(kit, out, t, "triangle", base * 2, 0.25, { peak: 0.04 });
  tone(kit, out, t + 0.09, "sine", base * 1.5, 0.7, { peak: 0.16 });
  return 0.85;
};

export const uiFocus: OneShotRecipe = (kit, out, t) => {
  tone(kit, out, t, "sine", 1320, 0.04, { peak: 0.06 });
  return 0.06;
};

export const uiDeny: OneShotRecipe = (kit, out, t) => {
  tone(kit, out, t, "square", 140, 0.12, { peak: 0.12, filter: 700 });
  tone(kit, out, t + 0.13, "square", 120, 0.12, { peak: 0.1, filter: 700 });
  return 0.3;
};

export const uiConfirm: OneShotRecipe = (kit, out, t) => {
  tone(kit, out, t, "sine", 880, 0.08, { endFreq: 1320, peak: 0.12 });
  return 0.12;
};

export const uiToggle: OneShotRecipe = (kit, out, t, p) => {
  tone(kit, out, t, "sine", 990 * (p.pitch ?? 1), 0.05, { peak: 0.1 });
  return 0.08;
};

// --- Music (original, generated) -----------------------------------------

export const introSwell: OneShotRecipe = (kit, out, t) => {
  for (const f of [110, 164.81, 220]) tone(kit, out, t, "sine", f, 2.2, { attack: 1.1, peak: 0.07 });
  return 3.4;
};

export const jingleWin: OneShotRecipe = (kit, out, t) => {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(kit, out, t + i * 0.11, "triangle", f, 0.5, { peak: 0.16 });
    tone(kit, out, t + i * 0.11, "sine", f * 2, 0.25, { peak: 0.04 });
  });
  for (const f of [523.25, 659.25, 783.99]) {
    tone(kit, out, t + 0.5, "sine", f, 1.6, { attack: 0.06, peak: 0.09 });
  }
  return 2.3;
};

export const jingleLose: OneShotRecipe = (kit, out, t) => {
  [392, 369.99, 311.13, 261.63].forEach((f, i) => {
    tone(kit, out, t + i * 0.28, "sawtooth", f, 0.45, { attack: 0.02, peak: 0.12, filter: 1100 });
  });
  for (const f of [130.81, 138.59]) tone(kit, out, t + 1.12, "sawtooth", f, 1.6, { attack: 0.05, peak: 0.1, filter: 500 });
  return 2.9;
};

/** Quiet night-room bed: a low beating drone and soft room tone. */
export const ambience: LoopRecipe = (kit, out) => {
  const ctx = kit.ctx;
  const t = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(1, t + 2.5);
  master.connect(out);

  const oscs = [110, 110.6, 164.81].map((f) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = f > 150 ? 0.012 : 0.025;
    osc.connect(g).connect(master);
    osc.start(t);
    return osc;
  });

  const room = ctx.createBufferSource();
  room.buffer = kit.noise;
  room.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 140;
  lfo.connect(lfoDepth).connect(lp.frequency);
  const roomGain = ctx.createGain();
  roomGain.gain.value = 0.02;
  room.connect(lp).connect(roomGain).connect(master);
  room.start(t);
  lfo.start(t);

  return (when) => {
    master.gain.cancelScheduledValues(when);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), when);
    master.gain.exponentialRampToValueAtTime(0.0001, when + 0.6);
    for (const node of [...oscs, room, lfo]) node.stop(when + 0.65);
  };
};
