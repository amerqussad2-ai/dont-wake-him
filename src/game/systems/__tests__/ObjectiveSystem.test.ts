import { describe, expect, it } from "vitest";

import { level1 } from "@/game/levels/level1";
import { ObjectiveSystem } from "@/game/systems/ObjectiveSystem";
import type { InteractableDefinition, ObjectiveId } from "@/game/types";

const definitions = level1.interactables;

/** The same prerequisite check the level scene applies before allowing an interaction. */
function prerequisiteMet(objectives: ObjectiveSystem, def: InteractableDefinition): boolean {
  return !def.requires || objectives.isComplete(def.requires);
}

function definition(id: ObjectiveId): InteractableDefinition {
  const def = definitions.find((d) => d.id === id);
  if (!def) throw new Error(`Level 1 has no interactable "${id}"`);
  return def;
}

describe("ObjectiveSystem (with Level 1 objectives)", () => {
  it("starts with every Level 1 objective incomplete, in level order", () => {
    const objectives = new ObjectiveSystem(definitions);
    expect(objectives.list.map((o) => o.id)).toEqual(["key", "drawer", "alarm"]);
    expect(objectives.list.map((o) => o.text)).toEqual(definitions.map((d) => d.objective));
    expect(objectives.list.every((o) => !o.done)).toBe(true);
    expect(objectives.completedCount).toBe(0);
    expect(objectives.allComplete).toBe(false);
  });

  it("marks a single objective complete without touching the others", () => {
    const objectives = new ObjectiveSystem(definitions);
    objectives.complete("key");
    expect(objectives.isComplete("key")).toBe(true);
    expect(objectives.isComplete("drawer")).toBe(false);
    expect(objectives.isComplete("alarm")).toBe(false);
    expect(objectives.completedCount).toBe(1);
  });

  it("is idempotent when the same objective is completed twice", () => {
    const objectives = new ObjectiveSystem(definitions);
    objectives.complete("alarm");
    objectives.complete("alarm");
    expect(objectives.completedCount).toBe(1);
  });

  it("ignores an id that is not part of the level", () => {
    const objectives = new ObjectiveSystem(definitions);
    objectives.complete("not-an-objective" as ObjectiveId);
    expect(objectives.completedCount).toBe(0);
  });

  it("keeps the drawer's prerequisite unmet until the key is collected", () => {
    const objectives = new ObjectiveSystem(definitions);
    const drawer = definition("drawer");
    expect(drawer.requires).toBe("key");
    expect(prerequisiteMet(objectives, drawer)).toBe(false);

    objectives.complete("alarm");
    expect(prerequisiteMet(objectives, drawer)).toBe(false);

    objectives.complete("key");
    expect(prerequisiteMet(objectives, drawer)).toBe(true);
  });

  it("has no prerequisites for the key and the alarm", () => {
    const objectives = new ObjectiveSystem(definitions);
    expect(prerequisiteMet(objectives, definition("key"))).toBe(true);
    expect(prerequisiteMet(objectives, definition("alarm"))).toBe(true);
  });

  it("does not itself enforce prerequisites (the level scene gates interactions)", () => {
    // Documents current behaviour: complete() records whatever it is told.
    // Prerequisite gating lives in Level1Scene.isAvailable, which uses isComplete().
    const objectives = new ObjectiveSystem(definitions);
    objectives.complete("drawer");
    expect(objectives.isComplete("drawer")).toBe(true);
    expect(objectives.isComplete("key")).toBe(false);
  });

  it("reports all complete only after the full key → drawer → alarm sequence", () => {
    const objectives = new ObjectiveSystem(definitions);
    const counts: number[] = [];
    for (const id of ["key", "drawer", "alarm"] as const) {
      expect(objectives.allComplete).toBe(false);
      expect(prerequisiteMet(objectives, definition(id))).toBe(true);
      objectives.complete(id);
      counts.push(objectives.completedCount);
    }
    expect(counts).toEqual([1, 2, 3]);
    expect(objectives.allComplete).toBe(true);
  });

  it("keeps separate state per instance (restarts start fresh)", () => {
    const first = new ObjectiveSystem(definitions);
    first.complete("key");
    const second = new ObjectiveSystem(definitions);
    expect(second.completedCount).toBe(0);
    expect(definitions.every((d) => !("done" in d))).toBe(true);
  });
});
