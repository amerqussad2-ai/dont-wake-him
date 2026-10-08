import { describe, expect, it } from "vitest";

import { BedTextures, PLAYER_SHEET, playerFrame, sleeperFaceKey, type SleeperFace } from "@/game/art/characterArt";
import { FxTextures, panelTextureKey, UiTextures } from "@/game/art/fxArt";
import {
  LevelArtNamespace,
  levelTextureKey,
  SharedArtCategories,
  sharedTextureKey,
  type SharedArtCategory,
} from "@/game/art/keys";
import { ObjectTextures } from "@/game/art/objectArt";
import { furnitureKey, RoomTextures } from "@/game/art/roomArt";
import type { FurnitureArt } from "@/game/types";

const FACES: SleeperFace[] = ["calm", "stirring", "restless", "awake"];
const FURNITURE: FurnitureArt[] = ["nightstand", "armchair", "toyChest"];

/** Every texture key the game currently declares, labelled by where it comes from. */
const inventory: [string, string][] = [
  ...Object.entries(FxTextures).map(([k, v]): [string, string] => [`FxTextures.${k}`, v]),
  ...Object.entries(UiTextures).map(([k, v]): [string, string] => [`UiTextures.${k}`, v]),
  ...Object.entries(ObjectTextures).map(([k, v]): [string, string] => [`ObjectTextures.${k}`, v]),
  ...Object.entries(RoomTextures).map(([k, v]): [string, string] => [`RoomTextures.${k}`, v]),
  ...Object.entries(BedTextures).map(([k, v]): [string, string] => [`BedTextures.${k}`, v]),
  ["PLAYER_SHEET", PLAYER_SHEET],
  ...FACES.map((f): [string, string] => [`sleeperFaceKey(${f})`, sleeperFaceKey(f)]),
  ...FURNITURE.map((a): [string, string] => [`furnitureKey(${a})`, furnitureKey(a)]),
];

const L1 = LevelArtNamespace.level1;

/** Textures drawn from Level 1's layout or sizes: these must be scoped to Level 1. */
const level1Specific = new Set<string>([
  RoomTextures.background,
  RoomTextures.lightmap,
  ObjectTextures.dresser,
  BedTextures.bed,
  BedTextures.pillow,
  BedTextures.blanket,
  ...FURNITURE.map(furnitureKey),
]);

describe("sharedTextureKey", () => {
  it("builds <category>/<name> and is deterministic", () => {
    expect(sharedTextureKey("fx", "glow")).toBe("fx/glow");
    expect(sharedTextureKey("fx", "glow")).toBe(sharedTextureKey("fx", "glow"));
  });

  it("accepts every declared shared category", () => {
    for (const category of SharedArtCategories) {
      expect(sharedTextureKey(category, "thing")).toBe(`${category}/thing`);
    }
  });
});

describe("levelTextureKey", () => {
  it("builds <level>/<name> inside the level's namespace", () => {
    expect(levelTextureKey(L1, "room-bg")).toBe("l1/room-bg");
    expect(levelTextureKey(L1, "room-bg").startsWith(`${L1}/`)).toBe(true);
  });

  it("gives Level 1 and Level 2 different keys for the same asset name", () => {
    expect(levelTextureKey("l1", "room-bg")).not.toBe(levelTextureKey("l2", "room-bg"));
  });

  it("never collides with a shared key for the same name", () => {
    for (const category of SharedArtCategories) {
      expect(levelTextureKey(L1, "glow")).not.toBe(sharedTextureKey(category, "glow"));
    }
  });
});

describe("invalid key parts", () => {
  it.each([
    ["empty name", () => sharedTextureKey("fx", "")],
    ["whitespace name", () => sharedTextureKey("ui", "   ")],
    ["name with a separator", () => sharedTextureKey("fx", "a/b")],
    ["unknown category", () => sharedTextureKey("nope" as SharedArtCategory, "glow")],
    ["empty level id", () => levelTextureKey("", "room-bg")],
    ["level id with a separator", () => levelTextureKey("l1/x", "room-bg")],
    ["level id equal to a shared category", () => levelTextureKey("fx", "room-bg")],
    ["empty level asset name", () => levelTextureKey(L1, "")],
  ])("rejects %s", (_label, build) => {
    expect(build).toThrow();
  });
});

describe("current texture inventory", () => {
  it("has no duplicate keys", () => {
    const seen = new Map<string, string>();
    for (const [source, key] of inventory) {
      expect(seen.has(key), `${source} reuses "${key}" from ${seen.get(key)}`).toBe(false);
      seen.set(key, source);
    }
  });

  it("scopes every layout-dependent texture to Level 1", () => {
    for (const key of level1Specific) {
      expect(key.startsWith(`${L1}/`), `"${key}" should be in the ${L1}/ namespace`).toBe(true);
    }
  });

  it("puts every other texture in a shared category, never a level namespace", () => {
    for (const [source, key] of inventory) {
      if (level1Specific.has(key)) continue;
      const [namespace] = key.split("/");
      expect(
        (SharedArtCategories as readonly string[]).includes(namespace),
        `${source} ("${key}") should use a shared category`,
      ).toBe(true);
    }
  });

  it("uses exactly one namespace separator in every key", () => {
    for (const [source, key] of inventory) {
      expect(key.split("/").length, `${source} ("${key}")`).toBe(2);
    }
  });

  it("keeps the agreed key strings (renaming a key must be deliberate)", () => {
    expect(Object.fromEntries(inventory)).toEqual({
      "FxTextures.glow": "fx/glow",
      "FxTextures.dot": "fx/dot",
      "FxTextures.ring": "fx/ring",
      "FxTextures.spark": "fx/spark",
      "FxTextures.shadow": "fx/shadow",
      "FxTextures.vignette": "fx/vignette",
      "FxTextures.danger": "fx/danger",
      "UiTextures.keycap": "ui/keycap",
      "UiTextures.barTrack": "ui/bar-track",
      "UiTextures.barNoise": "ui/bar-noise",
      "UiTextures.barSleep": "ui/bar-sleep",
      "UiTextures.iconNoise": "ui/icon-noise",
      "UiTextures.iconMoon": "ui/icon-moon",
      "UiTextures.iconClock": "ui/icon-clock",
      "UiTextures.iconLock": "ui/icon-lock",
      "UiTextures.checkEmpty": "ui/check-empty",
      "UiTextures.checkDone": "ui/check-done",
      "ObjectTextures.key": "obj/key",
      "ObjectTextures.clockOn": "obj/clock-on",
      "ObjectTextures.clockOff": "obj/clock-off",
      "ObjectTextures.dresser": "l1/dresser",
      "ObjectTextures.drawer": "obj/drawer",
      "ObjectTextures.wallet": "obj/wallet",
      "RoomTextures.background": "l1/room-bg",
      "RoomTextures.lightmap": "l1/room-lightmap",
      "BedTextures.bed": "l1/bed",
      "BedTextures.pillow": "l1/bed-pillow",
      "BedTextures.blanket": "l1/bed-blanket",
      "BedTextures.arm": "char/sleeper-arm",
      PLAYER_SHEET: "char/player",
      "sleeperFaceKey(calm)": "char/sleeper-calm",
      "sleeperFaceKey(stirring)": "char/sleeper-stirring",
      "sleeperFaceKey(restless)": "char/sleeper-restless",
      "sleeperFaceKey(awake)": "char/sleeper-awake",
      "furnitureKey(nightstand)": "l1/furniture-nightstand",
      "furnitureKey(armchair)": "l1/furniture-armchair",
      "furnitureKey(toyChest)": "l1/furniture-toyChest",
    });
  });
});

describe("panel texture keys", () => {
  it("are shared UI keys, one per size and accent", () => {
    const a = panelTextureKey(304, 150);
    expect(a.startsWith("ui/panel-304x150-")).toBe(true);
    expect(panelTextureKey(304, 150)).toBe(a);
    expect(panelTextureKey(340, 150)).not.toBe(a);
    expect(panelTextureKey(304, 150, "rgba(1, 2, 3, 0.45)")).not.toBe(a);
  });
});

describe("player sheet frames", () => {
  it("keeps frame names independent of the texture key", () => {
    // Frames live inside the sheet, so renaming the sheet must not rename them.
    expect(playerFrame("front", "idle")).toBe("front-idle");
    expect(playerFrame("back", "sneak-b")).toBe("back-sneak-b");
  });
});
