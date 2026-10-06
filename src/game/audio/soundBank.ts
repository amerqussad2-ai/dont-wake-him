import * as Synth from "@/game/audio/placeholderSounds";
import type { LoopRecipe, OneShotRecipe } from "@/game/audio/placeholderSounds";

export type Channel = "sfx" | "music";

export interface OneShotDefinition {
  recipe: OneShotRecipe;
  channel: Channel;
  /** Base gain for this sound. */
  volume: number;
  /** Minimum time between two plays of this sound. */
  cooldownMs: number;
  /** Maximum copies playing at once; extra plays are dropped. */
  maxVoices: number;
}

const sfx = (
  recipe: OneShotRecipe,
  volume = 1,
  cooldownMs = 0,
  maxVoices = 4,
): OneShotDefinition => ({ recipe, channel: "sfx", volume, cooldownMs, maxVoices });

const music = (recipe: OneShotRecipe, volume = 1): OneShotDefinition => ({
  recipe,
  channel: "music",
  volume,
  cooldownMs: 300,
  maxVoices: 1,
});

/** Every one-shot sound in the game. Swap a recipe here to use a real asset. */
export const Sounds = {
  step: sfx(Synth.footstep, 0.55, 80, 3),
  stepSneak: sfx(Synth.footstepSneak, 0.6, 80, 3),
  bump: sfx(Synth.bump, 0.9, 150, 2),
  keyPickup: sfx(Synth.keyPickup, 0.9, 200, 1),
  drawerOpen: sfx(Synth.drawerOpen, 1, 300, 1),
  alarmSwitch: sfx(Synth.alarmSwitch, 1, 200, 1),
  alarmTick: sfx(Synth.alarmTick, 0.5, 60, 2),
  alarmBeep: sfx(Synth.alarmBeep, 0.7, 300, 1),
  alarmRing: sfx(Synth.alarmRing, 0.9, 1000, 1),
  snore: sfx(Synth.snore, 0.8, 400, 1),
  breathIn: sfx(Synth.breathIn, 1, 200, 1),
  breathOut: sfx(Synth.breathOut, 1, 200, 1),
  murmur: sfx(Synth.murmur, 0.9, 800, 1),
  grumble: sfx(Synth.grumble, 0.9, 800, 1),
  rustle: sfx(Synth.rustle, 0.8, 250, 2),
  wakeGasp: sfx(Synth.wakeGasp, 1, 500, 1),
  wakeSting: sfx(Synth.wakeSting, 1, 500, 1),
  bedCreak: sfx(Synth.bedCreak, 1, 500, 1),
  wakeHit: sfx(Synth.wakeHit, 1, 500, 1),
  heartbeat: sfx(Synth.heartbeat, 0.8, 300, 1),
  objectiveChime: sfx(Synth.objectiveChime, 0.9, 150, 2),
  uiFocus: sfx(Synth.uiFocus, 0.7, 120, 1),
  uiDeny: sfx(Synth.uiDeny, 0.8, 300, 1),
  uiConfirm: sfx(Synth.uiConfirm, 0.8, 200, 1),
  uiToggle: sfx(Synth.uiToggle, 0.8, 60, 2),
  introSwell: music(Synth.introSwell, 1),
  jingleWin: music(Synth.jingleWin, 1),
  jingleLose: music(Synth.jingleLose, 1),
} satisfies Record<string, OneShotDefinition>;

export type SoundId = keyof typeof Sounds;

export const Loops = {
  ambience: { recipe: Synth.ambience, channel: "music" as Channel, volume: 1 },
} satisfies Record<string, { recipe: LoopRecipe; channel: Channel; volume: number }>;

export type LoopId = keyof typeof Loops;
