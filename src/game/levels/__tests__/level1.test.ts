import { describe, expect, it } from "vitest";

import { PlayerTuning } from "@/game/config/gameplay";
import { level1 } from "@/game/levels/level1";
import type { InteractableDefinition, ObjectiveId, Rect } from "@/game/types";

const HALF = PlayerTuning.size / 2;

/** Everything the player collides with, exactly as Level1Scene builds its solids. */
const solids: { name: string; rect: Rect }[] = [
  { name: "bed", rect: level1.bed },
  ...level1.furniture.map((f) => ({ name: f.art, rect: f as Rect })),
  ...level1.interactables.filter((i) => i.solid).map((i) => ({ name: i.id, rect: i.area })),
];

function playerBox(x: number, y: number): Rect {
  return { x: x - HALF, y: y - HALF, width: PlayerTuning.size, height: PlayerTuning.size };
}

/** Strict overlap: touching edges is not a collision. */
function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** Distance from a point to the nearest edge of a rect (0 inside), as InteractiveObject measures reach. */
function distanceToRect(px: number, py: number, r: Rect): number {
  const nx = Math.min(Math.max(px, r.x), r.x + r.width);
  const ny = Math.min(Math.max(py, r.y), r.y + r.height);
  return Math.hypot(px - nx, py - ny);
}

function canStandAt(x: number, y: number): boolean {
  const box = playerBox(x, y);
  return contains(level1.room, box) && solids.every((s) => !overlaps(box, s.rect));
}

function byId(id: string): InteractableDefinition {
  const def = level1.interactables.find((i) => i.id === id);
  if (!def) throw new Error(`Level 1 has no interactable "${id}"`);
  return def;
}

describe("Level 1 data", () => {
  describe("objectives", () => {
    it("has exactly three objectives: key, drawer, alarm (in that order)", () => {
      expect(level1.interactables.map((i) => i.id)).toEqual(["key", "drawer", "alarm"]);
    });

    it("uses unique objective ids", () => {
      const ids = level1.interactables.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("requires the key before the drawer, and nothing before the key or alarm", () => {
      expect(byId("drawer").requires).toBe("key");
      expect(byId("key").requires).toBeUndefined();
      expect(byId("alarm").requires).toBeUndefined();
    });

    it("only references prerequisites that exist, are not self-references and contain no cycles", () => {
      const ids = new Set(level1.interactables.map((i) => i.id));
      for (const def of level1.interactables) {
        if (!def.requires) continue;
        expect(ids.has(def.requires), `${def.id} requires unknown "${def.requires}"`).toBe(true);
        expect(def.requires, `${def.id} requires itself`).not.toBe(def.id);

        const seen = new Set<ObjectiveId>([def.id]);
        let current: ObjectiveId | undefined = def.requires;
        while (current) {
          expect(seen.has(current), `prerequisite cycle through "${current}"`).toBe(false);
          seen.add(current);
          current = byId(current).requires;
        }
      }
    });

    it("gives every gated object a locked hint", () => {
      for (const def of level1.interactables.filter((i) => i.requires)) {
        expect(def.lockedHint, `${def.id} has no lockedHint`).toBeTruthy();
      }
    });
  });

  describe("tuning values", () => {
    it("rings the alarm after 80 seconds", () => {
      expect(level1.alarmSeconds).toBe(80);
    });

    it("keeps the interaction noise values: key 10, drawer 32, alarm 18", () => {
      expect(Object.fromEntries(level1.interactables.map((i) => [i.id, i.noise]))).toEqual({
        key: 10,
        drawer: 32,
        alarm: 18,
      });
    });

    it("keeps the drawer as the only solid interactable", () => {
      expect(level1.interactables.filter((i) => i.solid).map((i) => i.id)).toEqual(["drawer"]);
    });
  });

  describe("layout", () => {
    it("places every interactable inside the room", () => {
      for (const def of level1.interactables) {
        expect(contains(level1.room, def.area), `${def.id} is outside the room`).toBe(true);
      }
    });

    it("places every solid (bed, furniture, solid objects) inside the room", () => {
      for (const s of solids) {
        expect(contains(level1.room, s.rect), `${s.name} is outside the room`).toBe(true);
      }
    });

    it("spawns the player fully inside the room", () => {
      const { x, y } = level1.playerStart;
      expect(contains(level1.room, playerBox(x, y))).toBe(true);
    });

    it("does not spawn the player inside any blocking object", () => {
      const box = playerBox(level1.playerStart.x, level1.playerStart.y);
      for (const s of solids) {
        expect(overlaps(box, s.rect), `player spawns inside ${s.name}`).toBe(false);
      }
    });

    it("leaves every interactable reachable from somewhere the player can stand", () => {
      // Sample the floor on a 4px grid for a free spot within interaction range.
      const { room } = level1;
      for (const def of level1.interactables) {
        let reachable = false;
        for (let x = room.x + HALF; x <= room.x + room.width - HALF && !reachable; x += 4) {
          for (let y = room.y + HALF; y <= room.y + room.height - HALF && !reachable; y += 4) {
            reachable = canStandAt(x, y) && distanceToRect(x, y, def.area) <= PlayerTuning.interactRange;
          }
        }
        expect(reachable, `${def.id} cannot be reached`).toBe(true);
      }
    });
  });
});
