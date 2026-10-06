import * as Phaser from "phaser";

import { Colors, Fonts, Palette } from "@/game/config/theme";
import { smoothing } from "@/game/ui/effects";

export interface MeterOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  /** Returns the fill colour for a value in 0..100. */
  color: (value: number) => number;
}

/** A labelled horizontal bar that eases toward its target value (0–100). */
export class Meter {
  readonly container: Phaser.GameObjects.Container;
  private readonly options: MeterOptions;
  private readonly frame: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private target = 0;
  private shown = 0;

  constructor(scene: Phaser.Scene, options: MeterOptions) {
    this.scene = scene;
    this.options = options;
    const { x, y, width, height, label } = options;
    const textStyle = { fontFamily: Fonts.primary, fontSize: "14px", color: Colors.text };

    this.labelText = scene.add.text(0, -20, label, textStyle);
    this.valueText = scene.add.text(width, -20, "0", textStyle).setOrigin(1, 0);
    this.frame = scene.add
      .rectangle(0, 0, width, height, Palette.meterBg)
      .setOrigin(0)
      .setStrokeStyle(2, Palette.meterFrame);
    this.fill = scene.add.rectangle(2, 2, 0, height - 4, options.color(0)).setOrigin(0);
    this.flash = scene.add
      .rectangle(0, 0, width, height, 0xffffff)
      .setOrigin(0)
      .setAlpha(0);

    this.container = scene.add.container(x, y, [
      this.labelText,
      this.valueText,
      this.frame,
      this.fill,
      this.flash,
    ]);
  }

  get displayed(): number {
    return this.shown;
  }

  setTarget(value: number): void {
    this.target = Phaser.Math.Clamp(value, 0, 100);
  }

  /** Quick white flash and a nudge, used when the value jumps. */
  kick(strength: number): void {
    this.flash.setAlpha(Math.min(0.7, 0.2 + strength / 40));
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 260 });
    this.scene.tweens.add({
      targets: this.container,
      x: this.options.x + Math.min(6, 2 + strength / 6),
      duration: 45,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.container.setX(this.options.x),
    });
  }

  /** Tints the label and frame, e.g. red while the value is dangerous. */
  setWarning(level: number): void {
    const color = level > 0 ? Palette.noiseHigh : Palette.meterFrame;
    this.frame.setStrokeStyle(2, color, level > 0 ? 0.5 + level * 0.5 : 1);
    this.labelText.setColor(level > 0 ? Colors.danger : Colors.text);
  }

  update(deltaSeconds: number): void {
    // Rise quickly, fall gently.
    const rate = this.target > this.shown ? 14 : 5;
    this.shown += (this.target - this.shown) * smoothing(rate, deltaSeconds);
    const inner = this.options.width - 4;
    this.fill.width = (inner * this.shown) / 100;
    this.fill.setFillStyle(this.options.color(this.shown));
    this.valueText.setText(String(Math.round(this.shown)));
  }
}
