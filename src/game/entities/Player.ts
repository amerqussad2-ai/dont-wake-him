import * as Phaser from "phaser";

import { PLAYER_FRAME, PLAYER_SHEET, playerFrame, type PlayerFacing, type PlayerPose } from "@/game/art/characterArt";
import { FxTextures } from "@/game/art/fxArt";
import { Depth, ySort } from "@/game/art/layers";
import { FeelTuning, PlayerTuning } from "@/game/config/gameplay";
import type { ControlState } from "@/game/systems/KeyboardControls";
import { smoothing } from "@/game/ui/effects";

type PhysicsRect = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export type Movement = "idle" | "walking" | "sneaking";

export interface PlayerUpdate {
  movement: Movement;
  /** True on frames where a footstep lands. */
  stepped: boolean;
}

/** Half the collision box: the character's feet sit at its bottom edge. */
const FOOT_OFFSET = PlayerTuning.size / 2;

/**
 * The player: an invisible physics box (collisions) with an animated
 * character sprite drawn on top, so the art never affects the rules.
 */
export class Player {
  readonly body: PhysicsRect;
  private readonly visual: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly rim: Phaser.GameObjects.Image;
  private frozen = false;
  private stepProgress = 0;
  private bobTime = 0;
  private sneakBlend = 0;
  private facing: PlayerFacing = "back";
  private flip = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const size = PlayerTuning.size;
    this.shadow = scene.add.image(x, y + FOOT_OFFSET, FxTextures.shadow).setScale(0.62, 0.7);
    // Collision box only: never drawn.
    const rect = scene.add.rectangle(x, y, size, size).setVisible(false);
    scene.physics.add.existing(rect);
    this.body = rect as PhysicsRect;
    this.body.body.setCollideWorldBounds(true);

    this.visual = scene.add
      .image(x, y + FOOT_OFFSET, PLAYER_SHEET, playerFrame(this.facing, "idle"))
      .setOrigin(0.5, PLAYER_FRAME.footY / PLAYER_FRAME.height);
    // A faint cool rim of light so the player reads in the dark.
    this.rim = scene.add
      .image(x, y, FxTextures.glow)
      .setTint(0x9fd8ff)
      .setScale(0.75)
      .setAlpha(0.14)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Depth.glow);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  /** Current speed as a fraction of walking speed (0..1). */
  get speedRatio(): number {
    return Math.min(1, this.body.body.velocity.length() / PlayerTuning.walkSpeed);
  }

  /** The character sprite, for celebratory tweens. */
  get sprite(): Phaser.GameObjects.Image {
    return this.visual;
  }

  update(controls: ControlState, deltaSeconds: number): PlayerUpdate {
    const body = this.body.body;
    const hasInput = !this.frozen && (controls.moveX !== 0 || controls.moveY !== 0);
    const sneaking = hasInput && controls.sneak;

    // Ease velocity toward the target instead of snapping to it.
    const speed = sneaking ? PlayerTuning.sneakSpeed : PlayerTuning.walkSpeed;
    const targetX = hasInput ? controls.moveX * speed : 0;
    const targetY = hasInput ? controls.moveY * speed : 0;
    const rate = hasInput ? FeelTuning.acceleration : FeelTuning.deceleration;
    const k = smoothing(rate, deltaSeconds);
    body.setVelocity(
      body.velocity.x + (targetX - body.velocity.x) * k,
      body.velocity.y + (targetY - body.velocity.y) * k,
    );
    if (!hasInput && body.velocity.lengthSq() < 4) body.setVelocity(0, 0);

    const moving = hasInput && body.velocity.lengthSq() > 100;
    const movement: Movement = !moving ? "idle" : sneaking ? "sneaking" : "walking";

    let stepped = false;
    if (moving) {
      this.stepProgress += body.velocity.length() * deltaSeconds;
      if (this.stepProgress >= FeelTuning.stepDistance) {
        this.stepProgress = 0;
        stepped = true;
      }
    }

    this.animate(movement, deltaSeconds);
    return { movement, stepped };
  }

  freeze(): void {
    this.frozen = true;
    this.body.body.setVelocity(0, 0);
  }

  /** Picks the frame for the current motion and keeps the art on the body. */
  private animate(movement: Movement, deltaSeconds: number): void {
    const velocity = this.body.body.velocity;
    this.sneakBlend += ((movement === "sneaking" ? 1 : 0) - this.sneakBlend) * smoothing(10, deltaSeconds);
    this.bobTime += deltaSeconds * (movement === "walking" ? 16 : movement === "sneaking" ? 9 : 2.2);

    // Face away when moving up, towards the camera otherwise; flip for left/right.
    if (movement !== "idle") {
      if (Math.abs(velocity.y) > 20) this.facing = velocity.y < 0 ? "back" : "front";
      if (Math.abs(velocity.x) > 20) this.flip = velocity.x < 0;
    }
    const phase = Math.sin(this.bobTime) >= 0 ? "a" : "b";
    const pose: PlayerPose =
      movement === "walking" ? `walk-${phase}` : movement === "sneaking" ? `sneak-${phase}` : this.sneakBlend > 0.5 ? "sneak-a" : "idle";
    const frame = playerFrame(this.facing, pose);
    if (this.visual.frame.name !== frame) this.visual.setFrame(frame);
    this.visual.setFlipX(this.flip);

    const bob = movement === "idle" ? 0 : Math.abs(Math.sin(this.bobTime)) * (2.5 - this.sneakBlend * 1.5);
    const breathe = movement === "idle" ? Math.sin(this.bobTime) * 0.018 : 0;
    const feetY = this.y + FOOT_OFFSET;

    this.visual.setPosition(this.x, feetY - bob);
    this.visual.setScale(1 - breathe * 0.5, 1 + breathe);
    this.visual.setDepth(ySort(feetY));

    this.shadow.setPosition(this.x, feetY - 1).setDepth(ySort(feetY) - 0.5);
    this.shadow.setScale(0.62 - bob * 0.02 + this.speedRatio * 0.05, 0.7);
    this.rim.setPosition(this.x, feetY - 24);
  }
}
