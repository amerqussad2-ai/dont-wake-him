import * as Phaser from "phaser";

import { Colors, Palette } from "@/game/config/theme";
import { SceneKeys, type GameOverData, type Level1StartData } from "@/game/types";
import { showEndScreen } from "@/game/ui/EndScreen";

const REASONS: Record<GameOverData["reason"], string> = {
  noise: "You made too much noise.",
  alarm: "The alarm clock went off.",
};

/** Overlay shown on top of the paused level after the wake-up sequence. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GameOver);
  }

  create(data: GameOverData): void {
    const restart: Level1StartData = { quickStart: true };
    showEndScreen(this, {
      title: "HE WOKE UP",
      titleColor: Colors.danger,
      tint: Palette.noiseHigh,
      impact: true,
      lines: [REASONS[data.reason]],
      actionLabel: "Try again",
      onAction: () => this.scene.start(SceneKeys.Level1, restart),
    });
  }
}
