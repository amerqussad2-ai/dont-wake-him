import { describe, expect, it } from "vitest";

import {
  externalTextureKey,
  isGeneratedTextureKey,
  selectTextureKey,
  summarizeLoad,
} from "@/game/art/ArtProvider";
import { BedTextures, PLAYER_SHEET, sleeperFaceKey } from "@/game/art/characterArt";
import { FxTextures, UiTextures } from "@/game/art/fxArt";
import {
  artManifest,
  ASSET_BASE_URL,
  checkManifest,
  manifestTextureKey,
  type ArtAssetEntry,
} from "@/game/art/manifest";
import { ObjectTextures } from "@/game/art/objectArt";
import { furnitureKey, RoomTextures } from "@/game/art/roomArt";

/** Every generated texture key the game declares today (from the V0a constants). */
const generatedKeys: string[] = [
  ...Object.values(FxTextures),
  ...Object.values(UiTextures),
  ...Object.values(ObjectTextures),
  ...Object.values(RoomTextures),
  ...Object.values(BedTextures),
  PLAYER_SHEET,
  ...(["calm", "stirring", "restless", "awake"] as const).map(sleeperFaceKey),
  ...(["nightstand", "armchair", "toyChest"] as const).map(furnitureKey),
];

const url = (file: string) => `${ASSET_BASE_URL}${file}`;

const validImage: ArtAssetEntry = { kind: "image", replaces: ObjectTextures.key, url: url("key.png") };
const validSheet: ArtAssetEntry = {
  kind: "spritesheet",
  replaces: PLAYER_SHEET,
  url: url("characters/player.png"),
  frameWidth: 64,
  frameHeight: 88,
};
const validAtlas: ArtAssetEntry = {
  kind: "atlas",
  replaces: sleeperFaceKey("calm"),
  url: url("characters/sleeper.webp"),
  dataUrl: url("characters/sleeper.json"),
};

describe("art manifest", () => {
  it("is empty until artwork is approved", () => {
    expect(artManifest).toEqual([]);
    expect(checkManifest(artManifest)).toEqual({ entries: [], problems: [] });
  });

  it("accepts valid image, sprite sheet and atlas entries in order", () => {
    const { entries, problems } = checkManifest([validImage, validSheet, validAtlas]);
    expect(problems).toEqual([]);
    expect(entries).toEqual([validImage, validSheet, validAtlas]);
  });

  it.each<[string, ArtAssetEntry]>([
    ["a plain name instead of a generated key", { ...validImage, replaces: "player" }],
    ["an external key", { ...validImage, replaces: "ext/char/player" }],
    ["an unknown namespace", { ...validImage, replaces: "zz/player" }],
    ["an empty key", { ...validImage, replaces: "" }],
    ["a URL outside the asset folder", { ...validImage, url: "/elsewhere/key.png" }],
    ["a non-image file", { ...validImage, url: url("key.gif") }],
    ["a path that climbs out of the folder", { ...validImage, url: url("../secret.png") }],
    ["a zero frame width", { ...validSheet, frameWidth: 0 }],
    ["a fractional frame height", { ...validSheet, frameHeight: 1.5 }],
    ["atlas data that is not JSON", { ...validAtlas, dataUrl: url("characters/sleeper.txt") }],
    ["an unknown kind", { ...validImage, kind: "video" } as unknown as ArtAssetEntry],
  ])("rejects an entry with %s, without throwing", (_label, entry) => {
    const result = checkManifest([entry]);
    expect(result.entries).toEqual([]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain("entry 0");
  });

  it("keeps the first entry and rejects a later duplicate for the same texture", () => {
    const duplicate = { ...validSheet, url: url("characters/player-v2.png") };
    const { entries, problems } = checkManifest([validSheet, validImage, duplicate]);
    expect(entries).toEqual([validSheet, validImage]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("entry 2");
    expect(problems[0]).toContain("already replaces");
  });

  it("loads each entry under a deterministic external name", () => {
    expect(manifestTextureKey(validSheet)).toBe("ext/char/player");
    expect(manifestTextureKey(validSheet)).toBe(manifestTextureKey({ ...validSheet }));
    expect(manifestTextureKey(validImage)).not.toBe(manifestTextureKey(validSheet));
  });
});

describe("external texture names", () => {
  it("recognises every current generated texture key", () => {
    for (const key of generatedKeys) {
      expect(isGeneratedTextureKey(key), key).toBe(true);
    }
  });

  it("never collide with any generated texture key", () => {
    const generated = new Set(generatedKeys);
    const external = generatedKeys.map(externalTextureKey);
    for (const key of external) {
      expect(generated.has(key), `${key} collides with generated art`).toBe(false);
      expect(isGeneratedTextureKey(key), `${key} looks like a generated key`).toBe(false);
    }
    expect(new Set(external).size).toBe(external.length);
  });

  it("refuses to build an external name from anything but a generated key", () => {
    expect(() => externalTextureKey("player")).toThrow();
    expect(() => externalTextureKey("ext/char/player")).toThrow();
    expect(() => externalTextureKey("")).toThrow();
  });
});

describe("texture selection", () => {
  it("falls back to the generated texture when no external art is loaded", () => {
    expect(selectTextureKey(PLAYER_SHEET, () => false)).toBe(PLAYER_SHEET);
  });

  it("prefers loaded external art", () => {
    const loaded = new Set([externalTextureKey(PLAYER_SHEET)]);
    expect(selectTextureKey(PLAYER_SHEET, (k) => loaded.has(k))).toBe("ext/char/player");
  });

  it("only swaps the texture whose external art is loaded", () => {
    const loaded = new Set([externalTextureKey(PLAYER_SHEET)]);
    expect(selectTextureKey(RoomTextures.background, (k) => loaded.has(k))).toBe(RoomTextures.background);
  });
});

describe("load summary", () => {
  it("reports nothing for an empty manifest", () => {
    expect(summarizeLoad([], [], () => true)).toEqual({ loaded: [], failed: [], rejected: [] });
  });

  it("splits queued textures into loaded and failed by what actually exists", () => {
    const queued = ["ext/char/player", "ext/obj/key", "ext/char/sleeper-calm"];
    const present = new Set(["ext/obj/key"]);
    expect(summarizeLoad(queued, ["entry 4: bad url"], (k) => present.has(k))).toEqual({
      loaded: ["ext/obj/key"],
      failed: ["ext/char/player", "ext/char/sleeper-calm"],
      rejected: ["entry 4: bad url"],
    });
  });
});
