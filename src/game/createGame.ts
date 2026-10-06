import * as Phaser from "phaser";

import { createGameConfig } from "@/game/config/gameConfig";

/** Creates the Phaser game. Must only be called in the browser. */
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game(createGameConfig(parent));
}
