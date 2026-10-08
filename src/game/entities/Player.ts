import * as Phaser from "phaser";

import { externalTextureKey } from "@/game/art/ArtProvider";
import { CharacterAtlases } from "@/game/art/characters/atlases";
import type { PranksterExpression, PranksterFacing } from "@/game/art/characters/prankster";
import { FxTextures } from "@/game/art/fxArt";
import { Depth, ySort } from "@/game/art/layers";
import { FeelTuning, PlayerTuning } from "@/game/config/gameplay";
import { ArtPlayerVisual, GeneratedPlayerVisual, type Movement, type PlayerVisual } from "@/game/entities/playerVisuals";
import type { ControlState } from "@/game/systems/KeyboardControls";
import { smoothing } from "@/game/ui/effects";

type PhysicsRect = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export type { Movement };

export interface PlayerUpdate {
  movement: Movement;
  /** True on frames where a footstep lands. */
  stepped: boolean;
}

/** Half the collision box: the character's feet sit at its bottom edge. */
const FOOT_OFFSET = PlayerTuning.size / 2;

/**
 * The player: an invisible physics box (collisions) with an animated
 * character drawn on top, so the art never affects the rules. The approved
 * art is used when its atlas loaded; otherwise the generated sprite.
 */
export class Player {
  readonly body: PhysicsRect;
  private readonly visual: PlayerVisual;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly rim: Phaser.GameObjects.Image;
  private frozen = false;
  private crouching = false;
  private stepProgress = 0;
  private facing: PranksterFacing = "back";
  private flip = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const size = PlayerTuning.size;
    this.shadow = scene.add.image(x, y + FOOT_OFFSET, FxTextures.shadow).setScale(0.62, 0.7);
    // Collision box only: never drawn.
    const rect = scene.add.rectangle(x, y, size, size).setVisible(false);
    scene.physics.add.existing(rect);
    this.body = rect as PhysicsRect;
    this.body.body.setCollideWorldBounds(true);

    const atlas = externalTextureKey(CharacterAtlases.prankster);
    this.visual = scene.textures.exists(atlas)
      ? new ArtPlayerVisual(scene, atlas, x, y + FOOT_OFFSET, this.facing)
      : new GeneratedPlayerVisual(scene, x, y + FOOT_OFFSET, this.facing);
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

  /** The drawn character, for celebratory tweens (origin at the feet, scale 1 at rest). */
  get sprite(): Phaser.GameObjects.Image | Phaser.GameObjects.Container {
    return this.visual.sprite;
  }

  /** Shows a facial reaction (approved art only). Purely visual. */
  react(expression: PranksterExpression, ms?: number, faceCamera = false): void {
    this.visual.react(expression, ms, faceCamera);
  }

  update(controls: ControlState, deltaSeconds: number): PlayerUpdate {
    const body = this.body.body;
    const hasInput = !this.frozen && (controls.moveX !== 0 || controls.moveY !== 0);
    const sneaking = hasInput && controls.sneak;
    this.crouching = !this.frozen && controls.sneak;

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

  /** Keeps the art on the body and tells it how the player is moving. */
  private animate(movement: Movement, deltaSeconds: number): void {
    const velocity = this.body.body.velocity;
    // Face away when moving up, towards the camera otherwise; flip for left/right.
    if (movement !== "idle") {
      if (Math.abs(velocity.y) > 20) this.facing = velocity.y < 0 ? "back" : "front";
      if (Math.abs(velocity.x) > 20) this.flip = velocity.x < 0;
    }
    const feetY = this.y + FOOT_OFFSET;
    const bob = this.visual.update(
      { x: this.x, feetY, movement, facing: this.facing, flip: this.flip, crouch: this.crouching, speed: velocity.length() },
      deltaSeconds,
    );

    const k = this.visual.footprint;
    this.shadow.setPosition(this.x, feetY - 1).setDepth(ySort(feetY) - 0.5);
    this.shadow.setScale((0.62 - bob * 0.02 + this.speedRatio * 0.05) * k, 0.7 * Math.sqrt(k));
    this.rim.setPosition(this.x, feetY - this.visual.height * 0.4);
  }
}
