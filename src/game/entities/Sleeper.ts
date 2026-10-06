import * as Phaser from "phaser";

import { Colors, Fonts, Palette } from "@/game/config/theme";
import type { Rect } from "@/game/types";

/** The sleeping character on the bed. Purely visual; reacts to noise and wakes. */
export class Sleeper {
  private readonly scene: Phaser.Scene;
  private readonly head: Phaser.GameObjects.Arc;
  private readonly headX: number;
  private readonly blanket: Phaser.GameObjects.Rectangle;
  private readonly snore: Phaser.GameObjects.Text;
  private readonly breathe: Phaser.Tweens.Tween;
  private awake = false;

  constructor(scene: Phaser.Scene, bed: Rect) {
    this.scene = scene;
    const cx = bed.x + bed.width / 2;

    scene.add.rectangle(cx, bed.y + bed.height / 2, bed.width, bed.height, Palette.bedFrame);
    scene.add.rectangle(cx, bed.y + bed.height / 2 + 4, bed.width - 20, bed.height - 20, Palette.mattress);
    scene.add.rectangle(cx, bed.y + 45, bed.width - 60, 50, Palette.pillow);

    this.headX = cx;
    this.head = scene.add.circle(cx, bed.y + 50, 24, Palette.skin);
    this.blanket = scene.add.rectangle(
      cx,
      bed.y + bed.height / 2 + 45,
      bed.width - 30,
      bed.height - 110,
      Palette.blanket,
    );

    this.breathe = scene.tweens.add({
      targets: this.blanket,
      scaleY: 1.03,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.snore = scene.add
      .text(cx + 30, bed.y + 10, "z z Z", {
        fontFamily: Fonts.primary,
        fontSize: "20px",
        color: Colors.mutedText,
      })
      .setOrigin(0, 1);
    scene.tweens.add({
      targets: this.snore,
      y: bed.y - 6,
      alpha: 0.2,
      duration: 2000,
      repeat: -1,
    });
  }

  /** Shows restlessness as the room gets louder. */
  update(noise: number, sleepDepth: number): void {
    if (this.awake) return;
    const restless = noise > 70;
    this.head.x = this.headX + (restless ? Phaser.Math.FloatBetween(-2, 2) : 0);
    this.snore.setVisible(sleepDepth > 35 && noise < 70);
  }

  wake(): void {
    if (this.awake) return;
    this.awake = true;
    this.breathe.stop();
    this.snore.setVisible(false);
    this.head.setFillStyle(0xe0b48c);
    this.scene.add
      .text(this.head.x, this.head.y - 40, "!", {
        fontFamily: Fonts.primary,
        fontSize: "48px",
        fontStyle: "bold",
        color: Colors.danger,
      })
      .setOrigin(0.5);
    this.scene.tweens.add({ targets: this.head, y: this.head.y + 30, duration: 300 });
  }
}
