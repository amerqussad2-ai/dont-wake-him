import type * as Phaser from "phaser";

/** Keys used to register and start Phaser scenes. */
export const SceneKeys = {
  Boot: "BootScene",
  Level1: "Level1Scene",
  Hud: "HudScene",
  GameOver: "GameOverScene",
  LevelComplete: "LevelCompleteScene",
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

export type ObjectiveId = "key" | "drawer" | "alarm";

/** Axis-aligned rectangle in game coordinates (x/y = top-left). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InteractableDefinition {
  id: ObjectiveId;
  /** Short name shown on the object and in the objective list. */
  label: string;
  objective: string;
  /** Prompt verb, e.g. "Pick up". */
  action: string;
  area: Rect;
  color: number;
  /** Base noise before the sleep-depth multiplier is applied. */
  noise: number;
  /** Objective that must be completed before this one is available. */
  requires?: ObjectiveId;
  /** Whether the player collides with it. */
  solid?: boolean;
  /** How the object animates when used. */
  effect: "pickup" | "open" | "switch";
  lockedHint?: string;
}

/** Which generated artwork a piece of furniture uses. */
export type FurnitureArt = "nightstand" | "armchair" | "toyChest";

export interface LevelDefinition {
  name: string;
  /** Walkable floor area; the player is kept inside it. */
  room: Rect;
  playerStart: { x: number; y: number };
  bed: Rect;
  /** Solid furniture the player collides with (the bed is included automatically). */
  furniture: (Rect & { art: FurnitureArt })[];
  interactables: InteractableDefinition[];
  /** Seconds until the alarm clock rings on its own. */
  alarmSeconds: number;
}

export type LoseReason = "noise" | "alarm";

export interface GameOverData {
  reason: LoseReason;
}

export interface LevelCompleteData {
  timeSeconds: number;
  peakNoise: number;
}

export interface Level1StartData {
  /** Retry after a win or loss: skip the long intro. */
  quickStart?: boolean;
}

/** Events the level scene emits for the HUD scene. */
export const LevelEvents = {
  Tick: "level-tick",
  IntroDone: "level-intro-done",
  Prompt: "level-prompt",
  NoiseBurst: "level-noise-burst",
  ObjectiveComplete: "level-objective-complete",
  Ended: "level-ended",
} as const;

export interface LevelTick {
  noise: number;
  sleepDepth: number;
  alarmSeconds: number | null;
  /** Player position on screen, so HUD cards can get out of the way. */
  playerScreen: { x: number; y: number };
}

export interface ObjectiveSnapshot {
  id: ObjectiveId;
  text: string;
  done: boolean;
}

export interface HudStartData {
  /** The level scene's event emitter. */
  events: Phaser.Events.EventEmitter;
  levelNumber: number;
  levelName: string;
  objectives: readonly ObjectiveSnapshot[];
  quickStart: boolean;
}
