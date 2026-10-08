import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors } from "@/game/config/theme";
import { BootScene } from "@/game/scenes/BootScene";
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
    // All sound goes through our AudioManager, so Phaser does not need its own.
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    // The first scene starts automatically: Boot loads optional artwork, then
    // starts Level 1. The rest is render order: HUD above the level, end
    // screens above the HUD.
    scene: [BootScene, Level1Scene, HudScene, GameOverScene, LevelCompleteScene],
  };
}
