import * as Phaser from "phaser";

import { AUDIO_REGISTRY_KEY } from "@/game/audio";
import { AudioManager } from "@/game/audio/AudioManager";
import { createGameConfig } from "@/game/config/gameConfig";

/** Creates the Phaser game. Must only be called in the browser. */
export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game(createGameConfig(parent));

  const audio = new AudioManager();
  audio.attach(window);
  game.registry.set(AUDIO_REGISTRY_KEY, audio);
  game.events.once(Phaser.Core.Events.DESTROY, () => audio.destroy());

  return game;
}
