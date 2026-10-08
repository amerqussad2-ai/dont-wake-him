import type * as Phaser from "phaser";

import { LevelArtNamespace, SharedArtCategories } from "@/game/art/keys";

/**
 * Chooses between optional external artwork and the generated fallback.
 *
 * Generated keys always have exactly one "/" ("char/player", "l1/room-bg").
 * External artwork is stored as "ext/<generated key>" (two "/"), so the two
 * can never collide, and generating fallback art never overwrites a loaded file.
 *
 * V1 only provides the selection; no entity uses it yet, so every visual still
 * comes from the generated art.
 */
const EXTERNAL_PREFIX = "ext";

const KNOWN_NAMESPACES: readonly string[] = [
  ...SharedArtCategories,
  ...Object.values(LevelArtNamespace),
];

/** True for keys produced by the V0a helpers (sharedTextureKey / levelTextureKey). */
export function isGeneratedTextureKey(key: string): boolean {
  if (typeof key !== "string") return false;
  const parts = key.split("/");
  return parts.length === 2 && KNOWN_NAMESPACES.includes(parts[0]) && parts[1].trim().length > 0;
}

/** Name an external file is loaded under, e.g. "char/player" → "ext/char/player". */
export function externalTextureKey(generatedKey: string): string {
  if (!isGeneratedTextureKey(generatedKey)) {
    throw new Error(`Not a generated texture key: "${generatedKey}"`);
  }
  return `${EXTERNAL_PREFIX}/${generatedKey}`;
}

/** Prefers loaded external art; otherwise returns the generated key unchanged. */
export function selectTextureKey(generatedKey: string, hasTexture: (key: string) => boolean): string {
  const external = externalTextureKey(generatedKey);
  return hasTexture(external) ? external : generatedKey;
}

/** Scene-facing helper: the texture key to draw for a generated art key. */
export function resolveTextureKey(scene: Phaser.Scene, generatedKey: string): string {
  return selectTextureKey(generatedKey, (key) => scene.textures.exists(key));
}

// --- Boot load reporting -------------------------------------------------

/** Registry key under which BootScene stores its AssetLoadReport. */
export const ART_LOAD_REPORT = "art-load-report";

export interface AssetLoadReport {
  loaded: string[];
  failed: string[];
  /** Manifest problems: entries that were never queued. */
  rejected: string[];
}

/** Splits queued texture keys into loaded and failed by what actually exists. */
export function summarizeLoad(
  queuedKeys: readonly string[],
  rejected: readonly string[],
  hasTexture: (key: string) => boolean,
): AssetLoadReport {
  return {
    loaded: queuedKeys.filter((key) => hasTexture(key)),
    failed: queuedKeys.filter((key) => !hasTexture(key)),
    rejected: [...rejected],
  };
}
