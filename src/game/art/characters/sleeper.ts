import { SLEEPER_ATLAS_DATA } from "@/game/art/characters/atlasFrames.generated";
import type { SleeperFace } from "@/game/art/characterArt";

/**
 * The Sleeper in the approved art, laid out on the existing top-down bed.
 * Positions are bed-local game pixels: x from the bed's centre line, y from
 * the top of the bed's footprint (same space as the generated Sleeper).
 */

/** Game pixels per source-art pixel (head about 85 px wide on the 230 px bed). */
export const SLEEPER_SOURCE_SCALE = 0.24;
/** Image scale for an atlas frame drawn at game size. */
export const SLEEPER_IMAGE_SCALE = SLEEPER_SOURCE_SCALE / SLEEPER_ATLAS_DATA.textureScale;
export const SLEEPER_FRAMES = SLEEPER_ATLAS_DATA.frames;

/** Approved head for each state. Calm has two: asleep, and snoring. */
export type SleeperArtFace = SleeperFace | "snoring";
export const SLEEPER_FACE_FRAMES: Record<SleeperArtFace, keyof typeof SLEEPER_FRAMES> = {
  calm: "head_sleepy",
  snoring: "head_snoring",
  stirring: "head_peeking",
  restless: "head_annoyed",
  awake: "head_startled",
};

export const SleeperLayout = {
  /** Heads hang from the collar line so every expression keeps the shoulders still. */
  collar: { x: 0, y: 76 },
  /** Arm behind his head, hand in his hair, sleeve end under the blanket. */
  arm: { x: 34, y: 38 },
  /** Top of the blanket's sheet fold, which covers the collar. */
  blanketTop: 67,
  /** The blanket art spans the mattress (214 px) and carries a 6 px shadow margin. */
  blanketWidth: 214,
  blanketMargin: 6,
  /** Where snore bubbles and Zs come from (his nose / mouth). */
  snoreFrom: { x: 22, y: 50 },
} as const;
