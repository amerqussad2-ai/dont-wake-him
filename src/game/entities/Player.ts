import * as Phaser from "phaser";

import { PlayerTuning } from "@/game/config/gameplay";
import { Palette } from "@/game/config/theme";
import type { ControlState } from "@/game/systems/KeyboardControls";

type PhysicsRect = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export type Movement = "idle" | "walking" | "sneaking";

/** The player: a placeholder square driven by arcade physics. */
export class Player {
  readonly body: PhysicsRect;
  private frozen = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const size = PlayerTuning.size;
    const rect = scene.add.rectangle(x, y, size, size, Palette.player);
    rect.setStrokeStyle(2, 0xffffff, 0.6);
    scene.physics.add.existing(rect);
    this.body = rect as PhysicsRect;
    this.body.body.setCollideWorldBounds(true);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  update(controls: ControlState): Movement {
    if (this.frozen) return "idle";

    const speed = controls.sneak ? PlayerTuning.sneakSpeed : PlayerTuning.walkSpeed;
    this.body.body.setVelocity(controls.moveX * speed, controls.moveY * speed);
    this.body.setFillStyle(controls.sneak ? Palette.playerSneak : Palette.player);

    // Use actual velocity so pushing against a wall does not count as walking.
    if (this.body.body.velocity.lengthSq() < 1) return "idle";
    return controls.sneak ? "sneaking" : "walking";
  }

  freeze(): void {
    this.frozen = true;
    this.body.body.setVelocity(0, 0);
  }
}
