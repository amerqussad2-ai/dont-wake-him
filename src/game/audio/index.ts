import type * as Phaser from "phaser";

import type { AudioManager } from "@/game/audio/AudioManager";

export const AUDIO_REGISTRY_KEY = "audio";

/** The game-wide AudioManager, shared by every scene through the registry. */
export function getAudio(scene: Phaser.Scene): AudioManager {
  return scene.registry.get(AUDIO_REGISTRY_KEY) as AudioManager;
}
