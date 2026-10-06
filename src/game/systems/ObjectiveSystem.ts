import type { InteractableDefinition, ObjectiveId } from "@/game/types";

export interface Objective {
  id: ObjectiveId;
  text: string;
  done: boolean;
}

/** Tracks which level objectives are complete. */
export class ObjectiveSystem {
  private readonly objectives: Objective[];

  constructor(definitions: InteractableDefinition[]) {
    this.objectives = definitions.map((d) => ({
      id: d.id,
      text: d.objective,
      done: false,
    }));
  }

  get list(): readonly Objective[] {
    return this.objectives;
  }

  get allComplete(): boolean {
    return this.objectives.every((o) => o.done);
  }

  isComplete(id: ObjectiveId): boolean {
    return this.objectives.some((o) => o.id === id && o.done);
  }

  complete(id: ObjectiveId): void {
    const objective = this.objectives.find((o) => o.id === id);
    if (objective) objective.done = true;
  }
}
