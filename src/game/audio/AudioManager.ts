import { AudioSettings } from "@/game/config/audio";
import type { PlayParams, SynthKit } from "@/game/audio/placeholderSounds";
import { Loops, Sounds, type Channel, type LoopId, type SoundId } from "@/game/audio/soundBank";

export type VolumeChannel = "master" | Channel;

export interface AudioState {
  master: number;
  sfx: number;
  music: number;
  muted: boolean;
  /** False until the browser lets audio start (first key press or click). */
  unlocked: boolean;
}

interface Voice {
  id: SoundId;
  gain: GainNode;
}

const STORAGE_KEY = "dont-wake-him:audio";
const UNLOCK_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * The single owner of all game audio: one AudioContext, a master bus and
 * separate SFX / music buses, cooldowns and voice limits per sound, looping
 * beds, and a hard stop for level restarts.
 *
 * The context is only created after a user gesture, as browsers require.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private kit: SynthKit | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<Channel, GainNode>> = {};
  private readonly state: AudioState;
  private readonly voices = new Set<Voice>();
  private readonly lastPlayed = new Map<SoundId, number>();
  private readonly loops = new Map<LoopId, ((when: number) => void) | null>();
  private readonly listeners = new Set<(state: AudioState) => void>();
  private readonly playCounts = new Map<SoundId, number>();
  private target: Window | null = null;

  constructor() {
    this.state = {
      master: AudioSettings.masterVolume,
      sfx: AudioSettings.sfxVolume,
      music: AudioSettings.musicVolume,
      muted: AudioSettings.muted,
      unlocked: false,
      ...loadSettings(),
    };
  }

  /** Starts listening for the first user gesture. */
  attach(target: Window): void {
    this.target = target;
    for (const event of UNLOCK_EVENTS) target.addEventListener(event, this.unlock, true);
    target.document.addEventListener("visibilitychange", this.onVisibility);
  }

  destroy(): void {
    if (this.target) {
      for (const event of UNLOCK_EVENTS) this.target.removeEventListener(event, this.unlock, true);
      this.target.document.removeEventListener("visibilitychange", this.onVisibility);
    }
    this.stopAll();
    void this.ctx?.close();
    this.ctx = null;
    this.listeners.clear();
  }

  get snapshot(): Readonly<AudioState> {
    return this.state;
  }

  /** How many times each sound actually played (useful when debugging the mix). */
  get stats(): ReadonlyMap<SoundId, number> {
    return this.playCounts;
  }

  onChange(listener: (state: AudioState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Mix ------------------------------------------------------------------

  setVolume(channel: VolumeChannel, value: number): void {
    this.state[channel] = Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
    this.applyMix();
  }

  setMuted(muted: boolean): void {
    this.state.muted = muted;
    this.applyMix();
  }

  toggleMute(): void {
    this.setMuted(!this.state.muted);
  }

  // --- Playback -------------------------------------------------------------

  /** Plays a one-shot. Returns false if it was dropped (locked, cooling down or too many voices). */
  play(id: SoundId, params: PlayParams = {}): boolean {
    const ctx = this.ctx;
    const kit = this.kit;
    if (!ctx || !kit || ctx.state !== "running") return false;

    const def = Sounds[id];
    const now = ctx.currentTime;
    const last = this.lastPlayed.get(id);
    if (last !== undefined && (now - last) * 1000 < def.cooldownMs) return false;
    let active = 0;
    for (const v of this.voices) if (v.id === id) active++;
    if (active >= def.maxVoices) return false;
    this.lastPlayed.set(id, now);

    const gain = ctx.createGain();
    gain.gain.value = def.volume * (params.volume ?? 1);
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.min(1, Math.max(-1, params.pan ?? 0));
    gain.connect(panner).connect(this.bus(def.channel));

    const voice: Voice = { id, gain };
    this.voices.add(voice);
    const duration = def.recipe(kit, gain, now + 0.005, params);
    window.setTimeout(() => this.release(voice), (duration + 0.2) * 1000);
    this.playCounts.set(id, (this.playCounts.get(id) ?? 0) + 1);
    return true;
  }

  /** Starts a loop now, or as soon as audio unlocks. Calling it twice is harmless. */
  startLoop(id: LoopId): void {
    if (this.loops.has(id)) return;
    this.loops.set(id, null);
    this.startPendingLoops();
  }

  stopLoop(id: LoopId): void {
    const stop = this.loops.get(id);
    this.loops.delete(id);
    if (stop && this.ctx) stop(this.ctx.currentTime);
  }

  /** Silences everything immediately (short fade), e.g. when a level restarts. */
  stopAll(): void {
    for (const id of [...this.loops.keys()]) this.stopLoop(id);
    const ctx = this.ctx;
    for (const voice of this.voices) {
      if (ctx) {
        voice.gain.gain.cancelScheduledValues(ctx.currentTime);
        voice.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      }
      window.setTimeout(() => this.release(voice), 150);
    }
    this.lastPlayed.clear();
  }

  // --- Internals ------------------------------------------------------------

  private readonly unlock = (): void => {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.kit = { ctx, noise: createNoise(ctx, 4) };
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.buses = {};
      this.applyMix(false);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().then(() => this.onUnlocked());
    } else {
      this.onUnlocked();
    }
  };

  private onUnlocked(): void {
    if (this.state.unlocked) return;
    this.state.unlocked = true;
    this.startPendingLoops();
    this.notify();
  }

  private readonly onVisibility = (): void => {
    if (!this.ctx || !this.state.unlocked) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  private startPendingLoops(): void {
    const ctx = this.ctx;
    const kit = this.kit;
    if (!ctx || !kit || ctx.state !== "running") return;
    for (const [id, stop] of this.loops) {
      if (stop) continue;
      const def = Loops[id];
      const gain = ctx.createGain();
      gain.gain.value = def.volume;
      gain.connect(this.bus(def.channel));
      const stopNodes = def.recipe(kit, gain);
      this.loops.set(id, (when) => {
        stopNodes(when);
        window.setTimeout(() => gain.disconnect(), 800);
      });
    }
  }

  private bus(channel: Channel): GainNode {
    let bus = this.buses[channel];
    if (!bus && this.ctx && this.master) {
      bus = this.ctx.createGain();
      bus.gain.value = this.state[channel];
      bus.connect(this.master);
      this.buses[channel] = bus;
    }
    return bus as GainNode;
  }

  private applyMix(persist = true): void {
    const ctx = this.ctx;
    if (ctx && this.master) {
      const t = ctx.currentTime;
      this.master.gain.setTargetAtTime(this.state.muted ? 0 : this.state.master, t, 0.03);
      for (const channel of ["sfx", "music"] as const) {
        this.bus(channel).gain.setTargetAtTime(this.state[channel], t, 0.03);
      }
    }
    if (persist) saveSettings(this.state);
    this.notify();
  }

  private release(voice: Voice): void {
    if (!this.voices.delete(voice)) return;
    voice.gain.disconnect();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}

function createNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Remembers the player's mix in this browser. Storage can be unavailable. */
function loadSettings(): Partial<AudioState> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw) as Partial<AudioState>;
    const pick = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 1 ? v : undefined);
    const result: Partial<AudioState> = {};
    const master = pick(saved.master);
    if (master !== undefined) result.master = master;
    if (typeof saved.muted === "boolean") result.muted = saved.muted;
    return result;
  } catch {
    return {};
  }
}

function saveSettings(state: AudioState): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ master: state.master, muted: state.muted }),
    );
  } catch {
    // Ignore: the mix just won't be remembered.
  }
}
