/**
 * Central texture naming.
 *
 * Texture keys are global to the Phaser game and `makeTexture` reuses any key
 * that already exists, so two different drawings must never share a key.
 *
 * - Shared art (characters, effects, UI, generic props) is named
 *   `<category>/<name>`, e.g. "fx/glow". It is drawn once and reused everywhere.
 * - Level art (anything whose drawing depends on a level's layout or sizes) is
 *   named `<level>/<name>`, e.g. "l1/room-bg", so Level 2 can draw its own
 *   "room-bg" without colliding with Level 1's.
 *
 * Invalid parts (empty, containing "/", or a level id that equals a shared
 * category) throw immediately, so a bad key fails loudly instead of silently
 * reusing the wrong texture.
 */

export const SharedArtCategories = ["char", "fx", "ui", "obj"] as const;
export type SharedArtCategory = (typeof SharedArtCategories)[number];

/** Namespaces for level-specific art. */
export const LevelArtNamespace = {
  level1: "l1",
} as const;

const SEPARATOR = "/";

function assertPart(kind: string, value: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Texture key ${kind} must be a non-empty string`);
  }
  if (value.includes(SEPARATOR)) {
    throw new Error(`Texture key ${kind} must not contain "${SEPARATOR}": "${value}"`);
  }
}

/** Key for art shared by every level, e.g. sharedTextureKey("fx", "glow") → "fx/glow". */
export function sharedTextureKey(category: SharedArtCategory, name: string): string {
  if (!(SharedArtCategories as readonly string[]).includes(category)) {
    throw new Error(`Unknown shared art category: "${category}"`);
  }
  assertPart("name", name);
  return `${category}${SEPARATOR}${name}`;
}

/** Key for art that belongs to one level, e.g. levelTextureKey("l1", "room-bg") → "l1/room-bg". */
export function levelTextureKey(levelId: string, name: string): string {
  assertPart("level id", levelId);
  if ((SharedArtCategories as readonly string[]).includes(levelId)) {
    throw new Error(`Level id "${levelId}" would collide with a shared art category`);
  }
  assertPart("name", name);
  return `${levelId}${SEPARATOR}${name}`;
}
