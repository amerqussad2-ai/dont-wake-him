import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors } from "@/game/config/theme";
import { GameOverScene } from "@/game/scenes/GameOverScene";
import { HudScene } from "@/game/scenes/HudScene";
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
    // Order is render order: HUD above the level, end screens above the HUD.
    scene: [Level1Scene, HudScene, GameOverScene, LevelCompleteScene],
  };
}
