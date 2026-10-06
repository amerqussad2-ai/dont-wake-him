import * as Phaser from "phaser";

import { Colors, Fonts, Palette } from "@/game/config/theme";

export interface MeterOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  /** Returns the fill colour for a value in 0..100. */
  color: (value: number) => number;
}

/** A labelled horizontal bar showing a value from 0 to 100. */
export class Meter {
  private readonly options: MeterOptions;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly valueText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, options: MeterOptions) {
    this.options = options;
    const { x, y, width, height, label } = options;
    const textStyle = { fontFamily: Fonts.primary, fontSize: "14px", color: Colors.text };

    scene.add.text(x, y - 20, label, textStyle);
    this.valueText = scene.add.text(x + width, y - 20, "0", textStyle).setOrigin(1, 0);
    scene.add
      .rectangle(x, y, width, height, Palette.meterBg)
      .setOrigin(0)
      .setStrokeStyle(2, Palette.meterFrame);
    this.fill = scene.add.rectangle(x + 2, y + 2, 0, height - 4, options.color(0)).setOrigin(0);
  }

  setValue(value: number): void {
    const clamped = Phaser.Math.Clamp(value, 0, 100);
    this.fill.width = ((this.options.width - 4) * clamped) / 100;
    this.fill.setFillStyle(this.options.color(clamped));
    this.valueText.setText(String(Math.round(clamped)));
  }
}
