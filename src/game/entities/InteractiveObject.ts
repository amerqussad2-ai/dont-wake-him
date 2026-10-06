import * as Phaser from "phaser";

import { Colors, Fonts, Palette } from "@/game/config/theme";
import type { InteractableDefinition } from "@/game/types";

/** A placeholder object the player can interact with once. */
export class InteractiveObject {
  readonly definition: InteractableDefinition;
  readonly shape: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly bounds: Phaser.Geom.Rectangle;
  private used = false;

  constructor(scene: Phaser.Scene, definition: InteractableDefinition) {
    this.definition = definition;
    const { x, y, width, height } = definition.area;
    this.bounds = new Phaser.Geom.Rectangle(x, y, width, height);

    this.shape = scene.add
      .rectangle(x + width / 2, y + height / 2, width, height, definition.color);

    this.label = scene.add
      .text(x + width / 2, y + height + 4, definition.label, {
        fontFamily: Fonts.primary,
        fontSize: "13px",
        color: Colors.mutedText,
      })
      .setOrigin(0.5, 0);
  }

  get isUsed(): boolean {
    return this.used;
  }

  /** Distance from a point to the nearest edge of the object (0 if inside). */
  distanceTo(x: number, y: number): number {
    const nx = Phaser.Math.Clamp(x, this.bounds.left, this.bounds.right);
    const ny = Phaser.Math.Clamp(y, this.bounds.top, this.bounds.bottom);
    return Phaser.Math.Distance.Between(x, y, nx, ny);
  }

  setHighlighted(on: boolean): void {
    if (on) this.shape.setStrokeStyle(3, Palette.highlight);
    else this.shape.setStrokeStyle();
  }

  markUsed(): void {
    this.used = true;
    this.setHighlighted(false);
    this.shape.setAlpha(0.35);
    this.label.setText(`${this.definition.label} ✓`).setColor(Colors.success);
  }
}
