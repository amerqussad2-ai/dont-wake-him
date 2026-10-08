import * as Phaser from "phaser";

import { ART_LOAD_REPORT, summarizeLoad } from "@/game/art/ArtProvider";
import { artManifest, checkManifest, manifestTextureKey, type ArtAssetEntry } from "@/game/art/manifest";
import { SceneKeys } from "@/game/types";

const isDev = process.env.NODE_ENV !== "production";

/**
 * First scene: queues optional external artwork, then starts Level 1.
 *
 * With an empty manifest nothing is loaded and the level starts on the next
 * step, so there is no loading screen. Missing or invalid files are left out:
 * generated art is used instead, and the problem is reported in the console
 * during development (players never see an error).
 */
export class BootScene extends Phaser.Scene {
  private queued: string[] = [];
  private rejected: string[] = [];

  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    const { entries, problems } = checkManifest(artManifest);
    this.rejected = problems;
    this.queued = entries.map(manifestTextureKey);
    for (const entry of entries) this.queue(entry);
  }

  create(): void {
    const report = summarizeLoad(this.queued, this.rejected, (key) => this.textures.exists(key));
    this.registry.set(ART_LOAD_REPORT, report);
    if (isDev) {
      for (const problem of report.rejected) console.warn(`[art] Skipped: ${problem}`);
      for (const key of report.failed) console.warn(`[art] Could not load "${key}"; using generated art.`);
    }
    this.scene.start(SceneKeys.Level1);
  }

  private queue(entry: ArtAssetEntry): void {
    const key = manifestTextureKey(entry);
    switch (entry.kind) {
      case "image":
        this.load.image(key, entry.url);
        break;
      case "spritesheet":
        this.load.spritesheet(key, entry.url, {
          frameWidth: entry.frameWidth,
          frameHeight: entry.frameHeight,
        });
        break;
      case "atlas":
        this.load.atlas(key, entry.url, entry.dataUrl);
        break;
    }
  }
}
