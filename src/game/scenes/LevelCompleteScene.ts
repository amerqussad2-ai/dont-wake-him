import * as Phaser from "phaser";

import { getAudio } from "@/game/audio";
import { Colors, Palette } from "@/game/config/theme";
import { SceneKeys, type Level1StartData, type LevelCompleteData } from "@/game/types";
import { showEndScreen } from "@/game/ui/EndScreen";

/** Overlay shown on top of the paused level when every objective is done. */
export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.LevelComplete);
  }

  create(data: LevelCompleteData): void {
    const restart: Level1StartData = { quickStart: true };
    const audio = getAudio(this);
    audio.play("jingleWin");
    const { lines } = showEndScreen(this, {
      title: "LEVEL COMPLETE",
      titleColor: Colors.success,
      tint: Palette.noiseLow,
      lines: ["He never noticed a thing.", formatStats(0, 0)],
      actionLabel: "Play again",
      onConfirm: () => audio.play("uiConfirm"),
      onAction: () => this.scene.start(SceneKeys.Level1, restart),
    });

    // Count the stats up once the line has appeared.
    const stats = lines[1];
    this.tweens.addCounter({
      from: 0,
      to: 1,
      delay: 650,
      duration: 700,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        stats.setText(formatStats(data.timeSeconds * t, data.peakNoise * t));
      },
    });
  }
}

function formatStats(time: number, peak: number): string {
  return `Time: ${time.toFixed(1)}s   ·   Peak noise: ${Math.round(peak)}`;
}
