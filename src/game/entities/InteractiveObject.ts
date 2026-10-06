import * as Phaser from "phaser";

import { addFootprintImage } from "@/game/art";
import { FxTextures, UiTextures } from "@/game/art/fxArt";
import { Depth, ySort } from "@/game/art/layers";
import { DRAWER, ObjectTextures } from "@/game/art/objectArt";
import { FurnitureHeight } from "@/game/art/roomArt";
import { Fonts } from "@/game/config/theme";
import type { InteractableDefinition } from "@/game/types";
import { burst } from "@/game/ui/effects";

export type FocusState = "none" | "available" | "locked";

const HIGHLIGHT = 0xfff0c2;
const LOCKED = 0xff6b7a;

/** How far above its interaction area the clock is drawn (it sits on the nightstand). */
const CLOCK_LIFT = 26;

/** An object the player can interact with once. */
export class InteractiveObject {
  readonly definition: InteractableDefinition;
  readonly sprite: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly outline: Phaser.GameObjects.Graphics;
  private readonly badge: Phaser.GameObjects.Container;
  private readonly keycap: Phaser.GameObjects.Image;
  private readonly lock: Phaser.GameObjects.Image;
  private readonly focusScale: number;
  private readonly bounds: Phaser.Geom.Rectangle;
  private ambient?: Phaser.GameObjects.Image;
  private ambientTween?: Phaser.Tweens.Tween;
  private focus: FocusState = "none";
  private pulse?: Phaser.Tweens.Tween;
  private used = false;

  constructor(scene: Phaser.Scene, definition: InteractableDefinition) {
    this.scene = scene;
    this.definition = definition;
    const { x, y, width, height } = definition.area;
    this.bounds = new Phaser.Geom.Rectangle(x, y, width, height);
    const cx = x + width / 2;
    const cy = y + height / 2;

    switch (definition.effect) {
      case "pickup":
        this.sprite = scene.add.image(cx, cy, ObjectTextures.key).setDepth(Depth.floorDecal + 1).setAngle(-18);
        this.focusScale = 1.25;
        break;
      case "open":
        this.sprite = addFootprintImage(scene, ObjectTextures.dresser, definition.area, FurnitureHeight.dresser);
        this.focusScale = 1.02;
        break;
      case "switch":
        // Drawn on the nightstand top; sorts just in front of it.
        this.sprite = scene.add
          .image(cx, cy - CLOCK_LIFT, ObjectTextures.clockOn)
          .setDepth(ySort(y + height + 40));
        this.focusScale = 1.12;
        break;
    }

    // Highlight pieces: a soft glow behind, a rounded outline and a floating badge.
    const frame = this.frameRect();
    this.glow = scene.add
      .image(frame.centerX, frame.centerY, FxTextures.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Depth.glow)
      .setScale((frame.width + 60) / 90, (frame.height + 60) / 90)
      .setAlpha(0);
    this.outline = scene.add.graphics().setDepth(Depth.fx).setAlpha(0);

    this.keycap = scene.add.image(0, 0, UiTextures.keycap).setScale(0.8);
    this.lock = scene.add.image(0, 0, UiTextures.iconLock).setTint(LOCKED).setVisible(false);
    const name = scene.add
      .text(16, 0, definition.label, {
        fontFamily: Fonts.display,
        fontSize: "14px",
        fontStyle: "700",
        color: "#fff6e0",
        stroke: "#140f24",
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5);
    this.badge = scene.add
      .container(frame.centerX - 26, frame.y - 18, [this.keycap, this.lock, name])
      .setDepth(Depth.fx)
      .setAlpha(0);
    scene.tweens.add({ targets: this.badge, y: "-=5", duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.addAmbient();
  }

  get isUsed(): boolean {
    return this.used;
  }

  /** Visual centre, for effects. */
  get position(): { x: number; y: number } {
    const frame = this.frameRect();
    return { x: frame.centerX, y: frame.centerY };
  }

  /** Distance from a point to the nearest edge of the interaction area (0 if inside). */
  distanceTo(x: number, y: number): number {
    const nx = Phaser.Math.Clamp(x, this.bounds.left, this.bounds.right);
    const ny = Phaser.Math.Clamp(y, this.bounds.top, this.bounds.bottom);
    return Phaser.Math.Distance.Between(x, y, nx, ny);
  }

  setFocus(focus: FocusState): void {
    if (this.used || focus === this.focus) return;
    this.focus = focus;
    const on = focus !== "none";
    const color = focus === "locked" ? LOCKED : HIGHLIGHT;

    this.drawOutline(color);
    this.pulse?.stop();
    this.glow.setTint(color);
    this.scene.tweens.add({ targets: this.outline, alpha: on ? 1 : 0, duration: 160 });
    this.scene.tweens.add({ targets: this.glow, alpha: on ? 0.32 : 0, duration: 200 });
    if (on) {
      this.pulse = this.scene.tweens.add({
        targets: this.glow,
        alpha: 0.16,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: 200,
      });
    }

    this.keycap.setVisible(focus !== "locked");
    this.lock.setVisible(focus === "locked");
    this.scene.tweens.add({ targets: this.badge, alpha: on ? 1 : 0, duration: 160 });
    this.scene.tweens.add({
      targets: this.sprite,
      scale: focus === "available" ? this.focusScale : 1,
      duration: 200,
      ease: "Back.easeOut",
    });
  }

  /** Feedback for trying to use something that is not available yet. */
  deny(): void {
    const x = this.sprite.x;
    this.scene.tweens.add({
      targets: this.sprite,
      x: x + 4,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.sprite.setX(x),
    });
    this.scene.tweens.add({ targets: this.glow, alpha: 0.6, duration: 80, yoyo: true });
  }

  /** Makes the alarm clock's glow pulse, faster when time is running out. */
  setUrgent(urgent: boolean): void {
    if (this.used || this.definition.effect !== "switch" || !this.ambient) return;
    this.ambientTween?.stop();
    this.ambient.setAlpha(urgent ? 0.6 : 0.35);
    this.ambientTween = this.scene.tweens.add({
      targets: this.ambient,
      alpha: urgent ? 0.15 : 0.18,
      scale: urgent ? 0.95 : 0.75,
      duration: urgent ? 180 : 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    if (urgent) {
      const x = this.sprite.x;
      this.scene.tweens.add({ targets: this.sprite, x: x + 1.5, duration: 50, yoyo: true, repeat: -1 });
    }
  }

  /** Plays the use animation for this object. */
  markUsed(player: { x: number; y: number }): void {
    this.setFocus("none");
    this.used = true;
    this.pulse?.stop();
    this.scene.tweens.add({ targets: [this.outline, this.badge, this.glow], alpha: 0, duration: 140 });

    const { scene, sprite } = this;
    const { x, y } = this.position;
    burst(scene, x, y, 0xffe2a0, 14);

    switch (this.definition.effect) {
      case "pickup":
        this.ambientTween?.stop();
        this.ambient?.destroy();
        // Into the player's pocket.
        scene.tweens.add({
          targets: sprite,
          x: player.x,
          y: player.y - 20,
          scale: 0.4,
          alpha: 0,
          duration: 380,
          ease: "Back.easeIn",
        });
        break;
      case "open":
        this.openDrawer(player);
        break;
      case "switch":
        scene.tweens.killTweensOf(sprite);
        sprite.setX(this.definition.area.x + this.definition.area.width / 2).setTexture(ObjectTextures.clockOff);
        scene.tweens.add({ targets: sprite, scale: 0.88, duration: 90, yoyo: true });
        this.ambientTween?.stop();
        if (this.ambient) scene.tweens.add({ targets: this.ambient, alpha: 0, duration: 400 });
        break;
    }
  }

  // --- Internals -----------------------------------------------------------

  /** Screen rectangle around the visible art (not the collision box). */
  private frameRect(): Phaser.Geom.Rectangle {
    const { x, y, width, height } = this.definition.area;
    switch (this.definition.effect) {
      case "pickup":
        return new Phaser.Geom.Rectangle(x - 10, y - 8, width + 20, height + 16);
      case "open": {
        const H = FurnitureHeight.dresser;
        return new Phaser.Geom.Rectangle(x - 6, y - H - 6, width + 12, height + H + 12);
      }
      case "switch":
        return new Phaser.Geom.Rectangle(x - 6, y - CLOCK_LIFT - 14, width + 12, height + 20);
    }
  }

  private drawOutline(color: number): void {
    const f = this.frameRect();
    this.outline.clear();
    this.outline.lineStyle(6, color, 0.18);
    this.outline.strokeRoundedRect(f.x - 2, f.y - 2, f.width + 4, f.height + 4, 14);
    this.outline.lineStyle(2, color, 0.95);
    this.outline.strokeRoundedRect(f.x, f.y, f.width, f.height, 12);
  }

  /** Idle life: a glint on the key, a red glow on the clock. */
  private addAmbient(): void {
    const { x, y } = this.position;
    if (this.definition.effect === "pickup") {
      this.ambient = this.scene.add
        .image(x + 8, y - 4, FxTextures.spark)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(Depth.glow)
        .setTint(0xfff1b0)
        .setScale(0)
        .setAlpha(0.9);
      this.ambientTween = this.scene.tweens.add({
        targets: this.ambient,
        scale: 0.7,
        angle: 90,
        duration: 500,
        yoyo: true,
        repeat: -1,
        repeatDelay: 1400,
        ease: "Sine.easeInOut",
      });
    }
    if (this.definition.effect === "switch") {
      this.ambient = this.scene.add
        .image(x, y + 4, FxTextures.glow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(Depth.glow)
        .setTint(0xff4d4d)
        .setScale(0.75);
      this.setUrgent(false);
    }
  }

  /** The middle drawer slides out and the wallet hops into the player's hands. */
  private openDrawer(player: { x: number; y: number }): void {
    const { scene } = this;
    const { x, y, width, height } = this.definition.area;
    const H = FurnitureHeight.dresser;
    const faceTop = y + height - H + 4;
    const drawer = scene.add
      .image(x + width / 2, faceTop - DRAWER.interior, ObjectTextures.drawer)
      .setOrigin(0.5, 0)
      .setDepth(this.sprite.depth + 0.1);
    const fullHeight = DRAWER.interior + DRAWER.front;
    drawer.setCrop(0, DRAWER.interior, DRAWER.width, DRAWER.front);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 420,
      ease: "Back.easeOut",
      onUpdate: (tween) => {
        const t = Phaser.Math.Clamp(tween.getValue() ?? 0, 0, 1.1);
        const open = Math.min(DRAWER.interior, DRAWER.interior * t);
        drawer.setY(faceTop - DRAWER.interior + 24 * t);
        drawer.setCrop(0, DRAWER.interior - open, DRAWER.width, fullHeight - (DRAWER.interior - open));
      },
    });

    const wallet = scene.add
      .image(x + width / 2, faceTop + 6, ObjectTextures.wallet)
      .setDepth(Depth.fx)
      .setAlpha(0);
    scene.tweens.chain({
      targets: wallet,
      tweens: [
        { alpha: 1, y: faceTop - 6, delay: 380, duration: 200, ease: "Quad.easeOut" },
        { x: player.x, y: player.y - 20, scale: 0.5, alpha: 0, duration: 380, ease: "Back.easeIn" },
      ],
      onComplete: () => wallet.destroy(),
    });
  }
}
