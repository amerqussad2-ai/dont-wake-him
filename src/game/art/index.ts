import type * as Phaser from "phaser";

import { FOOT_PAD } from "@/game/art/roomArt";

import { createPlayerTextures, createSleeperTextures } from "@/game/art/characterArt";
import { createFxTextures } from "@/game/art/fxArt";
import { createObjectTextures } from "@/game/art/objectArt";
import { createFurnitureTextures, createRoomTextures } from "@/game/art/roomArt";
import { ySort } from "@/game/art/layers";
import type { LevelDefinition, Rect } from "@/game/types";

/**
 * Generates every texture the level needs. Textures are global to the game,
 * so this only does work the first time (restarts reuse them).
 */
export function ensureLevelArt(scene: Phaser.Scene, level: LevelDefinition): void {
  createFxTextures(scene);
  createRoomTextures(scene, level);
  createFurnitureTextures(scene, level);
  createObjectTextures(scene, level);
  createPlayerTextures(scene);
  createSleeperTextures(scene, level.bed);
}

/**
 * Places a footprint texture so its footprint lines up with `rect` (the
 * collision box) and its top face rises `height` px above it. `extraTop` is
 * any further art above the top face (e.g. a headboard).
 */
export function addFootprintImage(
  scene: Phaser.Scene,
  key: string,
  rect: Rect,
  height: number,
  extraTop = 0,
): Phaser.GameObjects.Image {
  const texHeight = rect.height + height + extraTop + FOOT_PAD * 2;
  const bottomFromTop = FOOT_PAD + extraTop + height + rect.height;
  return scene.add
    .image(rect.x + rect.width / 2, rect.y + rect.height, key)
    .setOrigin(0.5, bottomFromTop / texHeight)
    .setDepth(ySort(rect.y + rect.height));
}
