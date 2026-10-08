import { sharedTextureKey } from "@/game/art/keys";

/**
 * The approved character artwork: one atlas per character, built from the
 * owner-approved art parts by tools/art/build_character_art.py.
 *
 * These keys name the art slots. BootScene loads each atlas as
 * "ext/<key>"; when it is missing, the characters fall back to the
 * generated (procedural) art.
 */
export const CharacterAtlases = {
  prankster: sharedTextureKey("char", "prankster"),
  sleeper: sharedTextureKey("char", "sleeper"),
} as const;

export const CHARACTER_ART_DIR = "characters";
