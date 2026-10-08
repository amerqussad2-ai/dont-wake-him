/**
 * Cut-out rig data: a character built from separate image parts that move
 * and scale around their joints.
 *
 * Poses deliberately have no rotation. Animated rotation on persistent
 * sprites rendered incompletely in headless WebGL (SwiftShader), so parts
 * only translate and scale; a part may have a fixed rest angle that never
 * changes.
 *
 * Everything here is plain data and math (no Phaser), so it can be tested.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Offset and scale of one part relative to its rest placement. */
export interface PartPose {
  /** Offset in rig pixels. */
  x?: number;
  y?: number;
  /** Scale around the part's pivot (1 = rest size). */
  scaleX?: number;
  scaleY?: number;
}

export type RigPose<P extends string> = Partial<Record<P, PartPose>>;

export interface CutoutPartSpec<P extends string> {
  name: P;
  texture: string;
  /** Existing frame on the texture; the whole texture when omitted. */
  frame?: string;
  /** Region of that frame to use, in frame pixels; the whole frame when omitted. */
  slice?: Point & Size;
  /** Rig-space joint the part moves and scales around. */
  pivot: Point;
  /**
   * Where the image sits: either the rig-space position of its top-left
   * corner (`at`), or the image origin (0..1) that lies on the pivot.
   */
  at?: Point;
  origin?: Point;
  /** Fixed angle in degrees, set once at rest and never animated. */
  restAngle?: number;
}

export interface CutoutRigSpec<P extends string> {
  /** Parts in draw order, back to front. */
  parts: readonly CutoutPartSpec<P>[];
  /** Rig-space point placed at the rig's world position (e.g. the feet). */
  anchor: Point;
}

export interface PartPlacement {
  /** Image origin (0..1) that puts the pivot at the image's position. */
  originX: number;
  originY: number;
  /** Pivot position relative to the rig anchor. */
  x: number;
  y: number;
}

/** Where a part image of `size` sits so that its pixels line up at rest. */
export function placePart(
  part: Pick<CutoutPartSpec<string>, "pivot" | "at" | "origin">,
  size: Size,
  anchor: Point,
): PartPlacement {
  const { pivot } = part;
  const at = part.at ?? {
    x: pivot.x - (part.origin?.x ?? 0.5) * size.width,
    y: pivot.y - (part.origin?.y ?? 0.5) * size.height,
  };
  return {
    originX: (pivot.x - at.x) / size.width,
    originY: (pivot.y - at.y) / size.height,
    x: pivot.x - anchor.x,
    y: pivot.y - anchor.y,
  };
}

export interface ResolvedPartPose {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export function resolvePartPose(pose: PartPose | undefined): ResolvedPartPose {
  return {
    x: pose?.x ?? 0,
    y: pose?.y ?? 0,
    scaleX: pose?.scaleX ?? 1,
    scaleY: pose?.scaleY ?? 1,
  };
}

/** Blends two poses part by part (`t` = 0 gives `a`, 1 gives `b`). */
export function mixPose<P extends string>(a: RigPose<P>, b: RigPose<P>, t: number): RigPose<P> {
  const out: RigPose<P> = {};
  const names = new Set([...Object.keys(a), ...Object.keys(b)] as P[]);
  for (const name of names) {
    const pa = resolvePartPose(a[name]);
    const pb = resolvePartPose(b[name]);
    out[name] = {
      x: pa.x + (pb.x - pa.x) * t,
      y: pa.y + (pb.y - pa.y) * t,
      scaleX: pa.scaleX + (pb.scaleX - pa.scaleX) * t,
      scaleY: pa.scaleY + (pb.scaleY - pa.scaleY) * t,
    };
  }
  return out;
}
