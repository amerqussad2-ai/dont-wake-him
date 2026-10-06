import * as Phaser from "phaser";

import { Colors, Fonts, Palette } from "@/game/config/theme";
import type { InteractableDefinition } from "@/game/types";
import { burst } from "@/game/ui/effects";

export type FocusState = "none" | "available" | "locked";

/** A placeholder object the player can interact with once. */
export class InteractiveObject {
  readonly definition: InteractableDefinition;
  readonly shape: Phaser.GameObjects.Rectangle;
  private readonly scene: Phaser.Scene;
  private readonly outline: Phaser.GameObjects.Rectangle;
  private readonly badge: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private readonly bounds: Phaser.Geom.Rectangle;
  private readonly focusScale: number;
  private focus: FocusState = "none";
  private outlinePulse?: Phaser.Tweens.Tween;
  private idle?: Phaser.Tweens.Tween;
  private used = false;

  constructor(scene: Phaser.Scene, definition: InteractableDefinition) {
    this.scene = scene;
    this.definition = definition;
    const { x, y, width, height } = definition.area;
    const cx = x + width / 2;
    const cy = y + height / 2;
    this.bounds = new Phaser.Geom.Rectangle(x, y, width, height);
    // Small objects grow more so the highlight reads at a glance.
    this.focusScale = width < 60 ? 1.25 : 1.04;

    this.shape = scene.add.rectangle(cx, cy, width, height, definition.color);
    this.outline = scene.add
      .rectangle(cx, cy, width + 12, height + 12)
      .setStrokeStyle(2, Palette.highlight)
      .setAlpha(0);

    this.label = scene.add
      .text(cx, y + height + 4, definition.label, {
        fontFamily: Fonts.primary,
        fontSize: "13px",
        color: Colors.mutedText,
      })
      .setOrigin(0.5, 0);

    this.badge = scene.add
      .text(cx, y - 10, "E", {
        fontFamily: Fonts.primary,
        fontSize: "14px",
        fontStyle: "bold",
        color: "#14121f",
        backgroundColor: "#fff3a3",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);
    scene.tweens.add({
      targets: this.badge,
      y: y - 16,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    if (definition.effect === "pickup") {
      // A faint glint so the key is noticeable on the floor.
      this.idle = scene.tweens.add({
        targets: this.shape,
        alpha: 0.6,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    if (definition.effect === "switch") this.setUrgent(false);
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

  setFocus(focus: FocusState): void {
    if (this.used || focus === this.focus) return;
    this.focus = focus;
    const on = focus !== "none";

    this.outlinePulse?.stop();
    this.outline.setStrokeStyle(2, focus === "locked" ? Palette.noiseHigh : Palette.highlight);
    this.scene.tweens.add({ targets: this.outline, alpha: on ? 1 : 0, duration: 150 });
    if (on) {
      this.outline.setScale(1.15);
      this.outlinePulse = this.scene.tweens.add({
        targets: this.outline,
        scale: 1,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    this.scene.tweens.add({
      targets: this.shape,
      scale: focus === "available" ? this.focusScale : 1,
      duration: 180,
      ease: "Back.easeOut",
    });
    this.scene.tweens.add({ targets: this.badge, alpha: focus === "available" ? 1 : 0, duration: 150 });
    this.label.setColor(on ? Colors.text : Colors.mutedText);
  }

  /** Feedback for trying to use something that is not available yet. */
  deny(): void {
    this.scene.tweens.add({
      targets: [this.shape, this.outline],
      x: this.shape.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }

  /** Makes the alarm clock blink, faster when time is running out. */
  setUrgent(urgent: boolean): void {
    if (this.used || this.definition.effect !== "switch") return;
    this.idle?.stop();
    this.shape.setAlpha(1);
    this.idle = this.scene.tweens.add({
      targets: this.shape,
      alpha: 0.35,
      duration: urgent ? 180 : 700,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Plays the use animation for this object. */
  markUsed(player: { x: number; y: number }): void {
    this.setFocus("none");
    this.used = true;
    this.idle?.stop();
    this.outlinePulse?.stop();
    this.scene.tweens.add({ targets: [this.outline, this.badge], alpha: 0, duration: 120 });

    const { shape, scene } = this;
    burst(scene, shape.x, shape.y, Palette.highlight, 12);
    this.label.setText(`${this.definition.label} ✓`).setColor(Colors.success);
    scene.tweens.add({ targets: this.label, scale: 1.3, duration: 140, yoyo: true, ease: "Quad.easeOut" });

    switch (this.definition.effect) {
      case "pickup":
        // Flies into the player's pocket.
        scene.tweens.add({
          targets: shape,
          x: player.x,
          y: player.y,
          scale: 0.3,
          alpha: 0,
          duration: 350,
          ease: "Back.easeIn",
        });
        break;
      case "open": {
        // A drawer slides out of the dresser.
        const { x, width, height } = this.definition.area;
        const drawer = scene.add
          .rectangle(x + width / 2, shape.y + height / 2 - 18, width - 30, 18, 0x9a7650)
          .setOrigin(0.5, 0)
          .setStrokeStyle(2, 0x000000, 0.3);
        scene.tweens.add({ targets: drawer, y: drawer.y + 22, duration: 420, ease: "Back.easeOut" });
        shape.setFillStyle(0x5c442e);
        break;
      }
      case "switch":
        shape.setFillStyle(0x3d6b4f).setAlpha(1);
        scene.tweens.add({ targets: shape, scale: 0.85, duration: 90, yoyo: true });
        break;
    }
  }
}
