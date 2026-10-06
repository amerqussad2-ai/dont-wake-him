import * as Phaser from "phaser";

import { addFootprintImage } from "@/game/art";
import { FxTextures } from "@/game/art/fxArt";
import { Depth } from "@/game/art/layers";
import { furnitureKey, FurnitureHeight, RoomFeatures, RoomTextures } from "@/game/art/roomArt";
import type { LevelDefinition } from "@/game/types";

/**
 * The bedroom's static visuals: background, furniture, lighting and ambient
 * motion. Collision is handled by the scene; this is presentation only.
 */
export class Room {
  constructor(scene: Phaser.Scene, level: LevelDefinition) {
    scene.add.image(0, 0, RoomTextures.background).setOrigin(0).setDepth(Depth.room);

    for (const piece of level.furniture) {
      addFootprintImage(scene, furnitureKey(piece.art), piece, FurnitureHeight[piece.art]);
    }

    // Multiply lightmap tints everything beneath it: cool night, warm pools.
    scene.add
      .image(0, 0, RoomTextures.lightmap)
      .setOrigin(0)
      .setDepth(Depth.light)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.addGlows(scene, level);
    this.addDust(scene);
  }

  /** Additive glows on the light sources themselves. */
  private addGlows(scene: Phaser.Scene, level: LevelDefinition): void {
    const glow = (x: number, y: number, tint: number, scaleX: number, alpha: number, scaleY = scaleX) =>
      scene.add
        .image(x, y, FxTextures.glow)
        .setTint(tint)
        .setScale(scaleX, scaleY)
        .setAlpha(alpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(Depth.glow);

    const { lamp, window: win, door } = RoomFeatures;
    const lampHalo = glow(lamp.x, lamp.y + 4, 0xffa95a, 2.2, 0.35);
    const lampCore = glow(lamp.x, lamp.y, 0xffe2b0, 0.45, 0.85);
    // A slow, barely visible flicker keeps the lamp alive.
    scene.tweens.add({
      targets: [lampHalo, lampCore],
      alpha: "-=0.08",
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    glow(win.x + win.width / 2, win.y + win.height / 2, 0x7f9cff, 2.6, 0.22, 1.4);
    glow(win.x + win.width - 34, win.y + 24, 0xe6ecff, 0.45, 0.6);
    const right = level.room.x + level.room.width;
    glow(right - 4, door.y + door.height / 2, 0xffb070, 0.7, 0.4, 1.5);
  }

  /** Dust motes drifting through the moonbeam. */
  private addDust(scene: Phaser.Scene): void {
    const { window: win } = RoomFeatures;
    scene.add
      .particles(0, 0, FxTextures.dot, {
        x: { min: win.x - 40, max: win.x + win.width + 120 },
        y: { min: 120, max: 470 },
        lifespan: { min: 5000, max: 8000 },
        speedX: { min: -6, max: 6 },
        speedY: { min: 2, max: 9 },
        scale: { min: 0.12, max: 0.32 },
        alpha: { start: 0.55, end: 0 },
        tint: 0xd6e0ff,
        frequency: 260,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(Depth.glow);
  }
}
