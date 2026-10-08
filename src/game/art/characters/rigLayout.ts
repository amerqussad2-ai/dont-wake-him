import { placePart, type PartPlacement, type Point } from "@/game/art/cutout/rig";
import type { AtlasFrameData } from "@/game/art/characters/atlasFrames.generated";

/**
 * One part of a character rig, in source-art pixels (the pixels of the
 * approved art parts). Pure data, so layouts can be tested without Phaser.
 */
export interface CharacterPart<P extends string> {
  name: P;
  /** Atlas frame name. */
  frame: string;
  /** Joint the part moves and scales around. */
  pivot: Point;
  /** Either: top-left of the original (untrimmed) art part... */
  at?: Point;
  /** ...or: the point of the trimmed frame (0..1) that sits on the pivot. */
  origin?: Point;
}

/** Rest placement of a part image so its pixels line up with the assembled art. */
export function framePlacement(
  part: Pick<CharacterPart<string>, "pivot" | "at" | "origin">,
  frame: AtlasFrameData,
  anchor: Point,
): PartPlacement {
  const size = { width: frame.width, height: frame.height };
  const at = part.at
    ? { x: part.at.x + frame.x, y: part.at.y + frame.y }
    : {
        x: part.pivot.x - (part.origin?.x ?? 0.5) * frame.width,
        y: part.pivot.y - (part.origin?.y ?? 0.5) * frame.height,
      };
  return placePart({ pivot: part.pivot, at }, size, anchor);
}
