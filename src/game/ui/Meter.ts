import * as Phaser from "phaser";

import { BAR, FxTextures, UiTextures } from "@/game/art/fxArt";
import { Colors, Fonts } from "@/game/config/theme";
import { smoothing } from "@/game/ui/effects";

export interface MeterOptions {
  x: number;
  y: number;
  label: string;
  icon: string;
  iconTint: number;
  /** Gradient texture for the fill. */
  fill: string;
  /** Right-aligned readout for a value in 0..100. */
  format?: (value: number) => string;
}

/** Icon, label, readout and a glossy capsule bar that eases toward its value. */
export class Meter {
  readonly container: Phaser.GameObjects.Container;
  private readonly options: MeterOptions;
  private readonly scene: Phaser.Scene;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly fill: Phaser.GameObjects.Image;
  private readonly flash: Phaser.GameObjects.Image;
  private readonly tip: Phaser.GameObjects.Image;
  private target = 0;
  private shown = 0;

  constructor(scene: Phaser.Scene, options: MeterOptions) {
    this.scene = scene;
    this.options = options;
    const small = { fontFamily: Fonts.primary, fontSize: "11px", color: Colors.mutedText };

    this.icon = scene.add.image(8, 0, options.icon).setScale(0.75).setTint(options.iconTint);
    this.labelText = scene.add.text(24, -7, options.label, small).setLetterSpacing(1.6);
    this.valueText = scene.add
      .text(BAR.width, -9, "", { fontFamily: Fonts.display, fontSize: "14px", fontStyle: "700", color: Colors.text })
      .setOrigin(1, 0);
    const track = scene.add.image(0, 16, UiTextures.barTrack).setOrigin(0, 0.5);
    this.fill = scene.add.image(0, 16, options.fill).setOrigin(0, 0.5);
    this.flash = scene.add
      .image(0, 16, options.fill)
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.tip = scene.add
      .image(0, 16, FxTextures.glow)
      .setScale(0.28)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);

    this.container = scene.add.container(options.x, options.y, [
      this.icon,
      this.labelText,
      this.valueText,
      track,
      this.fill,
      this.flash,
      this.tip,
    ]);
    this.render();
  }

  get displayed(): number {
    return this.shown;
  }

  setTarget(value: number): void {
    this.target = Phaser.Math.Clamp(value, 0, 100);
  }

  /** Brief glow and nudge when the value jumps. */
  kick(strength: number): void {
    this.flash.setAlpha(Math.min(0.9, 0.3 + strength / 30));
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 320 });
    this.scene.tweens.add({
      targets: this.container,
      x: this.options.x + Math.min(5, 2 + strength / 8),
      duration: 45,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.container.setX(this.options.x),
    });
  }

  /** 0 = normal, 1 = full warning (red label and icon, bright tip). */
  setWarning(level: number): void {
    const warn = level > 0;
    this.labelText.setColor(warn ? Colors.danger : Colors.mutedText);
    this.icon.setTint(warn ? 0xff6b7a : this.options.iconTint);
    this.tip.setTint(warn ? 0xff4d5e : 0xffffff).setAlpha(warn ? 0.5 + level * 0.5 : 0.35);
  }

  update(deltaSeconds: number): void {
    // Rise quickly, fall gently.
    const rate = this.target > this.shown ? 14 : 5;
    this.shown += (this.target - this.shown) * smoothing(rate, deltaSeconds);
    this.render();
  }

  private render(): void {
    const width = Math.max(0.001, (BAR.width * this.shown) / 100);
    this.fill.setCrop(0, 0, width, BAR.height);
    this.flash.setCrop(0, 0, width, BAR.height);
    this.tip.setX(width).setVisible(this.shown > 1);
    const format = this.options.format ?? ((v: number) => String(Math.round(v)));
    this.valueText.setText(format(this.shown));
  }
}
