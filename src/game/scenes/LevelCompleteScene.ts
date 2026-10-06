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
    const { stats } = showEndScreen(this, {
      title: "LEVEL COMPLETE",
      titleColor: Colors.success,
      tint: Palette.noiseLow,
      icon: "moon",
      subtitle: "He never noticed a thing.",
      stats: [formatTime(0), formatPeak(0)],
      actionLabel: "Play again",
      onConfirm: () => audio.play("uiConfirm"),
      onAction: () => this.scene.start(SceneKeys.Level1, restart),
    });

    // Count the stats up once the chips have appeared.
    this.tweens.addCounter({
      from: 0,
      to: 1,
      delay: 750,
      duration: 800,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        stats[0]?.setText(formatTime(data.timeSeconds * t));
        stats[1]?.setText(formatPeak(data.peakNoise * t));
      },
    });
  }
}

function formatTime(time: number): string {
  return `Time  ${time.toFixed(1)}s`;
}

function formatPeak(peak: number): string {
  return `Peak noise  ${Math.round(peak)}`;
}
