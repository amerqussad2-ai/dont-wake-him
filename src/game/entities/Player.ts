import * as Phaser from "phaser";

import { FeelTuning, PlayerTuning } from "@/game/config/gameplay";
import { Palette } from "@/game/config/theme";
import type { ControlState } from "@/game/systems/KeyboardControls";
import { lerpColor, smoothing } from "@/game/ui/effects";

type PhysicsRect = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export type Movement = "idle" | "walking" | "sneaking";

export interface PlayerUpdate {
  movement: Movement;
  /** True on frames where a footstep lands. */
  stepped: boolean;
}

/**
 * The player: an invisible physics box with a placeholder square drawn on top,
 * so the visual can bob and squash without affecting collisions.
 */
export class Player {
  readonly body: PhysicsRect;
  private readonly visual: Phaser.GameObjects.Rectangle;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private frozen = false;
  private stepProgress = 0;
  private bobTime = 0;
  private sneakBlend = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const size = PlayerTuning.size;
    this.shadow = scene.add.ellipse(x, y + size / 2, size + 6, 10, 0x000000, 0.35);
    const rect = scene.add.rectangle(x, y, size, size, 0x000000, 0);
    scene.physics.add.existing(rect);
    this.body = rect as PhysicsRect;
    this.body.body.setCollideWorldBounds(true);

    this.visual = scene.add
      .rectangle(x, y, size, size, Palette.player)
      .setStrokeStyle(2, 0xffffff, 0.6);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  /** The drawn square, for camera follow and celebratory tweens. */
  get sprite(): Phaser.GameObjects.Rectangle {
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

  /** Keeps the visual on the physics body, with a bob, squash and sneak crouch. */
  private animate(movement: Movement, deltaSeconds: number): void {
    const speedRatio = Math.min(1, this.body.body.velocity.length() / PlayerTuning.walkSpeed);
    this.sneakBlend += ((movement === "sneaking" ? 1 : 0) - this.sneakBlend) * smoothing(10, deltaSeconds);
    this.bobTime += deltaSeconds * (movement === "walking" ? 16 : 9);

    const bob = movement === "idle" ? 0 : Math.abs(Math.sin(this.bobTime)) * (3 - this.sneakBlend * 2);
    const breathe = movement === "idle" ? Math.sin(this.bobTime * 0.35) * 0.02 : 0;
    const crouch = this.sneakBlend * 0.14;

    this.visual.setPosition(this.x, this.y - bob);
    this.visual.setScale(1 + crouch + breathe, 1 - crouch + breathe);
    this.visual.setAngle(this.body.body.velocity.x * 0.03);
    this.visual.setFillStyle(lerpColor(Palette.player, Palette.playerSneak, this.sneakBlend));

    this.shadow.setPosition(this.x, this.y + PlayerTuning.size / 2);
    this.shadow.setScale(1 - bob * 0.04 + speedRatio * 0.08, 1);
  }
}
