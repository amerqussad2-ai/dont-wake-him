import { externalTextureKey, isGeneratedTextureKey } from "@/game/art/ArtProvider";

/**
 * Optional external artwork, loaded by BootScene before the level starts.
 *
 * Each entry names the generated texture it can replace (`replaces`, built
 * with the V0a key helpers, e.g. `PLAYER_SHEET`). The loaded file is stored
 * under its own `ext/<key>` name, so it never collides with generated art.
 * Files live in `public/`, so URLs start with ASSET_BASE_URL.
 *
 * Empty for now: no external artwork has been approved yet.
 */
export const ASSET_BASE_URL = "/assets/images/";

interface BaseEntry {
  /** Generated texture key this artwork can replace. */
  replaces: string;
  /** Image file under ASSET_BASE_URL (.png or .webp). */
  url: string;
}

export type ArtAssetEntry =
  | (BaseEntry & { kind: "image" })
  | (BaseEntry & { kind: "spritesheet"; frameWidth: number; frameHeight: number })
  | (BaseEntry & { kind: "atlas"; /** Phaser JSON atlas data under ASSET_BASE_URL. */ dataUrl: string });

export const artManifest: readonly ArtAssetEntry[] = [];

export interface ManifestCheck {
  /** Entries that are safe to queue, in manifest order. */
  entries: ArtAssetEntry[];
  /** Human-readable reasons for every entry that was rejected. */
  problems: string[];
}

const IMAGE_FILE = /\.(png|webp)$/i;

function isAssetUrl(url: string, pattern: RegExp): boolean {
  return typeof url === "string" && url.startsWith(ASSET_BASE_URL) && pattern.test(url) && !url.includes("..");
}

/**
 * Validates manifest entries. Invalid or duplicate entries are rejected (and
 * reported) instead of throwing: external art is optional and must never stop
 * the game from starting.
 */
export function checkManifest(manifest: readonly ArtAssetEntry[]): ManifestCheck {
  const entries: ArtAssetEntry[] = [];
  const problems: string[] = [];
  const claimed = new Set<string>();

  manifest.forEach((entry, index) => {
    const where = `art manifest entry ${index} (${entry.replaces || "no key"})`;
    const reasons: string[] = [];

    if (!isGeneratedTextureKey(entry.replaces)) {
      reasons.push(`"replaces" must be a generated texture key such as "char/player"`);
    } else if (claimed.has(entry.replaces)) {
      reasons.push(`another entry already replaces "${entry.replaces}"`);
    }
    if (!isAssetUrl(entry.url, IMAGE_FILE)) {
      reasons.push(`"url" must be a .png or .webp file under ${ASSET_BASE_URL}`);
    }
    if (entry.kind === "spritesheet") {
      for (const size of [entry.frameWidth, entry.frameHeight]) {
        if (!Number.isInteger(size) || size <= 0) reasons.push("frame sizes must be positive integers");
      }
    } else if (entry.kind === "atlas") {
      if (!isAssetUrl(entry.dataUrl, /\.json$/i)) reasons.push(`"dataUrl" must be a .json file under ${ASSET_BASE_URL}`);
    } else if (entry.kind !== "image") {
      reasons.push(`unknown kind "${(entry as { kind: string }).kind}"`);
    }

    if (reasons.length > 0) {
      problems.push(`${where}: ${[...new Set(reasons)].join("; ")}`);
      return;
    }
    claimed.add(entry.replaces);
    entries.push(entry);
  });

  return { entries, problems };
}

/** Texture key a manifest entry is loaded under. */
export function manifestTextureKey(entry: ArtAssetEntry): string {
  return externalTextureKey(entry.replaces);
}
