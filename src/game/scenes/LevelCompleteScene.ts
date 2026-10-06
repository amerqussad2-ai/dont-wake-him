import * as Phaser from "phaser";

import { Colors } from "@/game/config/theme";
import { SceneKeys, type LevelCompleteData } from "@/game/types";
import { showEndScreen } from "@/game/ui/EndScreen";

/** Overlay shown on top of the paused level when every objective is done. */
export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.LevelComplete);
  }

  create(data: LevelCompleteData): void {
    showEndScreen(this, {
      title: "LEVEL COMPLETE",
      titleColor: Colors.success,
      lines: [
        "He never noticed a thing.",
        `Time: ${data.timeSeconds.toFixed(1)}s   ·   Peak noise: ${Math.round(data.peakNoise)}`,
      ],
      actionLabel: "Play again",
      onAction: () => this.scene.start(SceneKeys.Level1),
    });
  }
}
