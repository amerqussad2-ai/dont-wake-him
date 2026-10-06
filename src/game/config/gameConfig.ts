import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors } from "@/game/config/theme";
import { MainScene } from "@/game/scenes/MainScene";

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
    scene: [MainScene],
  };
}
