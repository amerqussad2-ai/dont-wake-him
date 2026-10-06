import * as Phaser from "phaser";

import { Colors } from "@/game/config/theme";
import { SceneKeys, type GameOverData } from "@/game/types";
import { showEndScreen } from "@/game/ui/EndScreen";

const REASONS: Record<GameOverData["reason"], string> = {
  noise: "You made too much noise.",
  alarm: "The alarm clock went off.",
};

/** Overlay shown on top of the paused level when the sleeper wakes up. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GameOver);
  }

  create(data: GameOverData): void {
    showEndScreen(this, {
      title: "HE WOKE UP",
      titleColor: Colors.danger,
      lines: [REASONS[data.reason]],
      actionLabel: "Try again",
      onAction: () => this.scene.start(SceneKeys.Level1),
    });
  }
}
