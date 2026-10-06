import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors } from "@/game/config/theme";
import { GameOverScene } from "@/game/scenes/GameOverScene";
import { Level1Scene } from "@/game/scenes/Level1Scene";
import { LevelCompleteScene } from "@/game/scenes/LevelCompleteScene";

export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: Colors.bedroomBackground,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scene: [Level1Scene, GameOverScene, LevelCompleteScene],
  };
}
