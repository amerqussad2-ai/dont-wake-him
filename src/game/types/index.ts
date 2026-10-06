/** Keys used to register and start Phaser scenes. */
export const SceneKeys = {
  Level1: "Level1Scene",
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
  lockedHint?: string;
}

export interface LevelDefinition {
  name: string;
  /** Walkable floor area; the player is kept inside it. */
  room: Rect;
  playerStart: { x: number; y: number };
  bed: Rect;
  /** Solid furniture the player collides with (the bed is included automatically). */
  furniture: (Rect & { color: number; label?: string })[];
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
