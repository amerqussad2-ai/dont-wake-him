import type * as Phaser from "phaser";

import { CharacterRig } from "@/game/art/characters/CharacterRig";
import {
  PRANKSTER_ANCHOR,
  PRANKSTER_DISPLAY_SCALE,
  PRANKSTER_FRAMES,
  pranksterHeadFrame,
  pranksterParts,
  pranksterPose,
  type PranksterExpression,
  type PranksterFacing,
  type PranksterPart,
} from "@/game/art/characters/prankster";
import { PRANKSTER_ATLAS_DATA } from "@/game/art/characters/atlasFrames.generated";
import { PLAYER_FRAME, PLAYER_SHEET, playerFrame, type PlayerPose } from "@/game/art/characterArt";
import { ySort } from "@/game/art/layers";
import { smoothing } from "@/game/ui/effects";

export type Movement = "idle" | "walking" | "sneaking";

/** What the player's art needs to know each frame. Purely visual. */
export interface PlayerLook {
  x: number;
  feetY: number;
  movement: Movement;
  facing: PranksterFacing;
  flip: boolean;
  /** Shift is held (crouch even while standing still). */
  crouch: boolean;
  /** Current speed in px/s. */
  speed: number;
}

export interface PlayerVisual {
  /** The drawn character, for celebratory tweens (scale 1 at rest, origin at the feet). */
  readonly sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  /** Height of the drawn character above the feet, in game px. */
  readonly height: number;
  /** Shadow width relative to the generated sprite's. */
  readonly footprint: number;
  /** Updates the art; returns how far it is lifted off the floor this frame (for the shadow). */
  update(look: PlayerLook, deltaSeconds: number): number;
  /** Shows an expression for `ms` (or until changed); `faceCamera` turns him round to show it. */
  react(expression: PranksterExpression, ms?: number, faceCamera?: boolean): void;
}

/** The generated (procedural) sprite sheet: the fallback when the approved art is not loaded. */
export class GeneratedPlayerVisual implements PlayerVisual {
  readonly sprite: Phaser.GameObjects.Image;
  readonly height = PLAYER_FRAME.footY;
  readonly footprint = 1;
  private bobTime = 0;
  private sneakBlend = 0;

  constructor(scene: Phaser.Scene, x: number, feetY: number, facing: PranksterFacing) {
    this.sprite = scene.add
      .image(x, feetY, PLAYER_SHEET, playerFrame(facing, "idle"))
      .setOrigin(0.5, PLAYER_FRAME.footY / PLAYER_FRAME.height);
  }

  update(look: PlayerLook, deltaSeconds: number): number {
    const { movement } = look;
    this.sneakBlend += ((movement === "sneaking" ? 1 : 0) - this.sneakBlend) * smoothing(10, deltaSeconds);
    this.bobTime += deltaSeconds * (movement === "walking" ? 16 : movement === "sneaking" ? 9 : 2.2);

    const phase = Math.sin(this.bobTime) >= 0 ? "a" : "b";
    const pose: PlayerPose =
      movement === "walking" ? `walk-${phase}` : movement === "sneaking" ? `sneak-${phase}` : this.sneakBlend > 0.5 ? "sneak-a" : "idle";
    const frame = playerFrame(look.facing, pose);
    if (this.sprite.frame.name !== frame) this.sprite.setFrame(frame);
    this.sprite.setFlipX(look.flip);

    const bob = movement === "idle" ? 0 : Math.abs(Math.sin(this.bobTime)) * (2.5 - this.sneakBlend * 1.5);
    const breathe = movement === "idle" ? Math.sin(this.bobTime) * 0.018 : 0;
    this.sprite.setPosition(look.x, look.feetY - bob);
    this.sprite.setScale(1 - breathe * 0.5, 1 + breathe);
    this.sprite.setDepth(ySort(look.feetY));
    return bob;
  }

  react(): void {
    // The generated sprite has no expressions.
  }
}

const TAU = Math.PI * 2;
/** Breathing cycle (radians per second), matching the generated sprite's idle. */
const BREATH_RATE = 2.2;

/** The approved Prankster art as a cut-out rig. */
export class ArtPlayerVisual implements PlayerVisual {
  readonly height = 90;
  /** The approved art stands wider than the generated sprite. */
  readonly footprint = 1.35;
  private readonly rig: CharacterRig<PranksterPart>;
  private facing: PranksterFacing;
  private expression: PranksterExpression = "smile";
  private override: { expression: PranksterExpression; remaining: number; faceCamera: boolean } | null = null;
  private breath = 0;
  private stride = 0;
  private walkBlend = 0;
  private sneakBlend = 0;

  constructor(scene: Phaser.Scene, atlasKey: string, x: number, feetY: number, facing: PranksterFacing) {
    this.facing = facing;
    this.rig = new CharacterRig(
      scene,
      { key: atlasKey, textureScale: PRANKSTER_ATLAS_DATA.textureScale, frames: PRANKSTER_FRAMES },
      PRANKSTER_DISPLAY_SCALE,
      pranksterParts(facing),
      PRANKSTER_ANCHOR[facing],
    );
    this.rig.root.setPosition(x, feetY);
    this.rig.applyPose({});
  }

  get sprite(): Phaser.GameObjects.Container {
    return this.rig.root;
  }

  update(look: PlayerLook, deltaSeconds: number): number {
    const dt = deltaSeconds;
    if (this.override && (this.override.remaining -= dt * 1000) <= 0) this.override = null;

    const facing: PranksterFacing = this.override?.faceCamera ? "front" : look.facing;
    const expression: PranksterExpression = this.override?.expression ?? (look.crouch || look.movement === "sneaking" ? "mischief" : "smile");
    this.show(facing, expression);

    // Feet step in time with the distance covered, so they never skate.
    const moving = look.movement !== "idle";
    const sneaking = look.movement === "sneaking";
    // px travelled per full cycle (two steps): about 5 steps/s walking and 3 sneaking, like the generated sprite
    const strideLength = sneaking ? 66 : 80;
    if (moving) this.stride += (look.speed * dt * TAU) / strideLength;
    this.breath += dt * BREATH_RATE;
    const k = smoothing(10, dt);
    this.walkBlend += ((look.movement === "walking" ? 1 : 0) - this.walkBlend) * k;
    this.sneakBlend += ((look.crouch || sneaking ? 1 : 0) - this.sneakBlend) * k;

    this.rig.applyPose(pranksterPose({ breath: this.breath, stride: this.stride, walk: this.walkBlend, sneak: this.sneakBlend, moving }));
    this.rig.setFlip(look.flip);
    this.rig.root.setPosition(look.x, look.feetY).setDepth(ySort(look.feetY));
    return moving ? Math.abs(Math.sin(this.stride)) * 1.5 * (1 - this.sneakBlend * 0.7) : 0;
  }

  react(expression: PranksterExpression, ms = Number.POSITIVE_INFINITY, faceCamera = false): void {
    this.override = { expression, remaining: ms, faceCamera };
    this.show(faceCamera ? "front" : this.facing, expression);
  }

  private show(facing: PranksterFacing, expression: PranksterExpression): void {
    if (facing !== this.facing) {
      this.facing = facing;
      this.expression = expression;
      this.rig.setParts(pranksterParts(facing, expression), PRANKSTER_ANCHOR[facing]);
    } else if (expression !== this.expression) {
      this.expression = expression;
      const head = pranksterHeadFrame(facing, expression);
      this.rig.setFrame("head", head.frame, head);
    }
  }
}
