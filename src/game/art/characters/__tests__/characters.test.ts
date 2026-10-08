import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PRANKSTER_ATLAS_DATA,
  SLEEPER_ATLAS_DATA,
  type AtlasFrameData,
} from "@/game/art/characters/atlasFrames.generated";
import {
  idlePose,
  PRANKSTER_ANCHOR,
  pranksterHeadFrame,
  pranksterParts,
  pranksterPose,
  sneakPose,
  walkPose,
  type PranksterExpression,
  type PranksterFacing,
} from "@/game/art/characters/prankster";
import { framePlacement } from "@/game/art/characters/rigLayout";
import { SLEEPER_FACE_FRAMES } from "@/game/art/characters/sleeper";
import { resolvePartPose, type RigPose } from "@/game/art/cutout/rig";

const CHARACTER_DIR = join(__dirname, "../../../../../public/assets/images/characters");
const FACINGS: PranksterFacing[] = ["front", "back"];
const EXPRESSIONS: PranksterExpression[] = ["smile", "mischief", "shocked"];
const TAU = Math.PI * 2;

function atlasJson(name: string) {
  return JSON.parse(readFileSync(join(CHARACTER_DIR, `${name}.json`), "utf8")) as {
    frames: Record<string, { frame: { w: number; h: number } }>;
    meta: { image: string; size: { w: number; h: number } };
  };
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(name: string): { w: number; h: number } {
  const png = readFileSync(join(CHARACTER_DIR, `${name}.png`));
  return { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
}

describe("character atlases", () => {
  it.each([
    ["prankster", PRANKSTER_ATLAS_DATA],
    ["sleeper", SLEEPER_ATLAS_DATA],
  ] as const)("%s: the atlas files and the generated layout data agree", (name, data) => {
    const json = atlasJson(name);
    expect(Object.keys(json.frames).sort()).toEqual(Object.keys(data.frames).sort());
    expect(json.meta.image).toBe(`${name}.png`);
    expect(pngSize(name)).toEqual(json.meta.size);
    for (const [frame, entry] of Object.entries(json.frames)) {
      const source = (data.frames as Readonly<Record<string, AtlasFrameData>>)[frame];
      // Frame pixels = source-art size x texture scale (to within rounding).
      expect(Math.abs(entry.frame.w - source.width * data.textureScale), frame).toBeLessThan(1);
      expect(Math.abs(entry.frame.h - source.height * data.textureScale), frame).toBeLessThan(1);
    }
  });

  it("has every frame the Prankster rig uses, for both facings and all expressions", () => {
    for (const facing of FACINGS) {
      for (const expression of EXPRESSIONS) {
        for (const part of pranksterParts(facing, expression)) {
          expect(PRANKSTER_ATLAS_DATA.frames, `${facing}/${expression}/${part.name}`).toHaveProperty(part.frame);
        }
      }
    }
  });

  it("has a Sleeper head for every state, plus the snore pieces", () => {
    for (const frame of Object.values(SLEEPER_FACE_FRAMES)) expect(SLEEPER_ATLAS_DATA.frames).toHaveProperty(frame);
    for (const frame of ["arm_over_head", "blanket_topdown", "snore_bubble", "z_2", "z_3"]) {
      expect(SLEEPER_ATLAS_DATA.frames).toHaveProperty(frame);
    }
  });
});

describe("Prankster rig layout", () => {
  it("draws the same seven parts in a stable order for each facing", () => {
    expect(pranksterParts("front").map((p) => p.name)).toEqual(["hip", "legL", "legR", "torso", "armL", "armR", "head"]);
    // From behind, the forearms tuck under the torso's sleeves.
    expect(pranksterParts("back").map((p) => p.name)).toEqual(["hip", "legL", "legR", "armL", "armR", "torso", "head"]);
  });

  it("keeps the expression heads on the same neck joint", () => {
    const pivots = EXPRESSIONS.map((e) => pranksterHeadFrame("front", e).pivot);
    expect(new Set(pivots.map((p) => `${p.x},${p.y}`)).size).toBe(1);
    expect(pranksterHeadFrame("back", "shocked").frame).toBe("head_back");
  });

  it("places trimmed frames back where the art was cut from", () => {
    const frame = { x: 10, y: 20, width: 100, height: 50 };
    const placed = framePlacement({ at: { x: 5, y: 5 }, pivot: { x: 65, y: 50 } }, frame, { x: 0, y: 100 });
    // Trimmed image starts at (15, 25); pivot (65, 50) is half-way across and half-way down.
    expect(placed).toEqual({ originX: 0.5, originY: 0.5, x: 65, y: -50 });
    const byOrigin = framePlacement({ origin: { x: 0.5, y: 1 }, pivot: { x: 0, y: 76 } }, frame, { x: 0, y: 0 });
    expect(byOrigin).toEqual({ originX: 0.5, originY: 1, x: 0, y: 76 });
  });

  it("stands on its feet in both facings", () => {
    for (const facing of FACINGS) {
      const anchor = PRANKSTER_ANCHOR[facing];
      for (const part of pranksterParts(facing)) {
        const frame = PRANKSTER_ATLAS_DATA.frames[part.frame as keyof typeof PRANKSTER_ATLAS_DATA.frames];
        const top = part.at!.y + frame.y;
        // Nothing hangs below the soles.
        expect(top + frame.height, `${facing} ${part.name}`).toBeLessThanOrEqual(anchor.y + 6);
      }
    }
  });
});

/** Every part only moves a little and never rotates. */
function expectGentle(pose: RigPose<string>, maxOffset: number) {
  for (const [name, part] of Object.entries(pose)) {
    expect(Object.keys(part ?? {}).every((k) => ["x", "y", "scaleX", "scaleY"].includes(k)), name).toBe(true);
    const p = resolvePartPose(part);
    expect(Math.abs(p.x) + Math.abs(p.y), name).toBeLessThanOrEqual(maxOffset);
    for (const s of [p.scaleX, p.scaleY]) {
      expect(s, name).toBeGreaterThan(0.88);
      expect(s, name).toBeLessThan(1.08);
    }
  }
}

describe("Prankster motion", () => {
  const phases = Array.from({ length: 24 }, (_, i) => (TAU * i) / 24);

  it("keeps idle, walk and sneak poses subtle and rotation-free", () => {
    for (const t of phases) {
      expectGentle(idlePose(t), 20);
      expectGentle(walkPose(t), 60);
      expectGentle(sneakPose(t, true), 110);
    }
  });

  it("keeps the feet planted while idle", () => {
    for (const t of phases) {
      expect(idlePose(t).legL).toBeUndefined();
      expect(idlePose(t).legR).toBeUndefined();
    }
  });

  it("alternates the legs while walking", () => {
    const left = walkPose(TAU / 4);
    const right = walkPose((TAU * 3) / 4);
    expect(left.legL!.y!).toBeLessThan(right.legL!.y!);
    expect(right.legR!.y!).toBeLessThan(left.legR!.y!);
  });

  it("crouches when sneaking: the head drops noticeably but the soles stay on the floor", () => {
    const upright = resolvePartPose(pranksterPose({ breath: 0, stride: 0, walk: 0, sneak: 0, moving: false }).head);
    const crouched = resolvePartPose(pranksterPose({ breath: 0, stride: 0, walk: 0, sneak: 1, moving: false }).head);
    expect(crouched.y - upright.y).toBeGreaterThan(50); // about 5 game px at 90 px tall
    const leg = resolvePartPose(sneakPose(0, false).legL);
    const legPivotY = 510;
    const sole = PRANKSTER_ANCHOR.front.y;
    const soleAfter = legPivotY + (sole - legPivotY) * leg.scaleY + leg.y;
    expect(Math.abs(soleAfter - sole)).toBeLessThan(15);
  });

  it("blends smoothly between idle, walk and sneak", () => {
    const at = (walk: number, sneak: number) => resolvePartPose(pranksterPose({ breath: 1, stride: 1, walk, sneak, moving: true }).torso);
    const half = at(0.5, 0);
    expect(half.y).toBeCloseTo((at(0, 0).y + at(1, 0).y) / 2, 6);
    expect(at(2, 0)).toEqual(at(1, 0));
  });
});
