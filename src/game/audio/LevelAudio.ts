import { AudioTuning } from "@/game/config/audio";
import { GAME_WIDTH } from "@/game/config/constants";
import { FeelTuning } from "@/game/config/gameplay";
import type { AudioManager } from "@/game/audio/AudioManager";
import type { SleeperStage, WakeBeat } from "@/game/entities/Sleeper";
import type { InteractableDefinition } from "@/game/types";

const INTERACT_SOUNDS = {
  pickup: "keyPickup",
  open: "drawerOpen",
  switch: "alarmSwitch",
} as const;

const WAKE_SOUNDS = {
  gasp: "wakeGasp",
  eyes: "wakeSting",
  sitUp: "bedCreak",
  alert: "wakeHit",
} as const;

/**
 * Translates what happens in a level into sound. The scene calls these hooks;
 * all decisions about which sound, how loud and how often live here.
 */
export class LevelAudio {
  private readonly audio: AudioManager;
  private tickTimer = 0;
  private tock = false;
  private lastAlarmSecond = -1;
  private heartbeatTimer = 0;
  private stepSide = 1;
  private active = true;
  private disposed = false;

  constructor(audio: AudioManager) {
    this.audio = audio;
  }

  /** Level start: room tone, plus a soft swell for the full intro. */
  start(fullIntro: boolean): void {
    this.audio.startLoop("ambience");
    if (fullIntro) this.audio.play("introSwell");
  }

  /** Per-frame update while the player is in control. */
  update(deltaSeconds: number, noise: number, alarmSeconds: number | null): void {
    if (!this.active) return;
    this.updateAlarm(deltaSeconds, alarmSeconds);
    this.updateHeartbeat(deltaSeconds, noise);
  }

  step(sneaking: boolean, speedRatio: number, x: number): void {
    this.stepSide *= -1;
    const pan = this.pan(x) + this.stepSide * 0.08;
    if (sneaking) this.audio.play("stepSneak", { pan, intensity: speedRatio });
    else this.audio.play("step", { pan, intensity: 0.5 + speedRatio * 0.5 });
  }

  bump(x: number): void {
    this.audio.play("bump", { pan: this.pan(x) });
  }

  focus(locked: boolean): void {
    if (!locked) this.audio.play("uiFocus");
  }

  deny(): void {
    this.audio.play("uiDeny");
  }

  interact(effect: InteractableDefinition["effect"], x: number): void {
    this.audio.play(INTERACT_SOUNDS[effect], { pan: this.pan(x) });
  }

  objectiveComplete(completed: number): void {
    // Slightly after the interaction sound so the two do not mask each other.
    window.setTimeout(() => {
      if (!this.disposed) this.audio.play("objectiveChime", { step: completed - 1 });
    }, 180);
  }

  // --- Sleeper (driven by the sleeper's own animation callbacks) -----------

  breath(phase: "in" | "out", stage: SleeperStage, snoring: boolean, durationMs: number, x: number): void {
    if (!this.active) return;
    const duration = durationMs / 1000;
    const pan = this.pan(x);
    const volume = stage === "calm" ? 0.8 : stage === "stirring" ? 1.1 : 1.5;
    if (phase === "in" && snoring) this.audio.play("snore", { duration, pan });
    else this.audio.play(phase === "in" ? "breathIn" : "breathOut", { duration, pan, volume });
  }

  stirred(stage: SleeperStage, x: number): void {
    if (!this.active) return;
    this.audio.play(stage === "restless" ? "grumble" : "murmur", { pan: this.pan(x) });
  }

  fidget(stage: SleeperStage, x: number): void {
    if (!this.active) return;
    this.audio.play("rustle", { pan: this.pan(x), volume: stage === "restless" ? 1.3 : 0.8 });
  }

  /** Each beat is fired by the matching wake-up animation, so sound and picture line up. */
  wakeBeat(beat: WakeBeat, x: number): void {
    this.audio.play(WAKE_SOUNDS[beat], { pan: this.pan(x) * 0.5 });
  }

  // --- Endings -------------------------------------------------------------

  alarmRing(x: number): void {
    this.audio.play("alarmRing", { pan: this.pan(x) });
  }

  /** He woke up: stop the level bed and timers; the wake beats carry the moment. */
  lose(): void {
    this.active = false;
    this.audio.stopLoop("ambience");
  }

  win(): void {
    this.active = false;
    this.audio.stopLoop("ambience");
  }

  /** Called when the level shuts down (restart): nothing may keep playing. */
  dispose(): void {
    this.active = false;
    this.disposed = true;
    this.audio.stopAll();
  }

  // --- Internals -----------------------------------------------------------

  /** Ticks every second; in the last seconds it speeds up and beeps, rising in pitch. */
  private updateAlarm(deltaSeconds: number, seconds: number | null): void {
    if (seconds === null) return;
    const urgentWindow = FeelTuning.alarmUrgentSeconds;
    const urgent = seconds <= urgentWindow;
    const progress = urgent ? 1 - seconds / urgentWindow : 0;
    const interval = urgent
      ? AudioTuning.alarmTickUrgentStart +
        (AudioTuning.alarmTickUrgentEnd - AudioTuning.alarmTickUrgentStart) * progress
      : AudioTuning.alarmTickCalm;

    this.tickTimer -= deltaSeconds;
    if (this.tickTimer <= 0) {
      this.tickTimer = interval;
      this.tock = !this.tock;
      this.audio.play("alarmTick", {
        pitch: this.tock ? 0.82 : 1,
        volume: urgent ? 1 + progress : 0.7,
        pan: this.pan(415),
      });
    }

    const second = Math.ceil(seconds);
    if (urgent && second !== this.lastAlarmSecond) {
      this.lastAlarmSecond = second;
      this.audio.play("alarmBeep", { pitch: 1 + progress * 0.35, volume: 0.6 + progress * 0.6, pan: this.pan(415) });
    }
  }

  /** A heartbeat under the mix while noise is dangerous, faster as it climbs. */
  private updateHeartbeat(deltaSeconds: number, noise: number): void {
    const danger = (noise - FeelTuning.dangerNoise) / (100 - FeelTuning.dangerNoise);
    if (danger <= 0) {
      this.heartbeatTimer = 0;
      return;
    }
    this.heartbeatTimer -= deltaSeconds;
    if (this.heartbeatTimer <= 0) {
      const d = Math.min(1, danger);
      this.heartbeatTimer =
        AudioTuning.heartbeatSlow + (AudioTuning.heartbeatFast - AudioTuning.heartbeatSlow) * d;
      this.audio.play("heartbeat", { intensity: 0.5 + d * 0.5 });
    }
  }

  private pan(x: number): number {
    return ((x / GAME_WIDTH) * 2 - 1) * AudioTuning.panSpread;
  }
}
