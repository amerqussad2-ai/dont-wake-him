import type * as Phaser from "phaser";

import type { Point, RigPose } from "@/game/art/cutout/rig";
import { resolvePartPose, type PartPlacement } from "@/game/art/cutout/rig";
import type { AtlasFrameData } from "@/game/art/characters/atlasFrames.generated";
import { framePlacement, type CharacterPart } from "@/game/art/characters/rigLayout";

export interface RigAtlas {
  /** Loaded texture key of the atlas. */
  key: string;
  /** Atlas pixels per source-art pixel. */
  textureScale: number;
  frames: Readonly<Record<string, AtlasFrameData>>;
}

interface LivePart {
  image: Phaser.GameObjects.Image;
  part: CharacterPart<string>;
  rest: PartPlacement;
}

/**
 * A cut-out character built from atlas frames. Parts only move and scale
 * around their joints (no animated rotation).
 *
 * `root` sits at the anchor (e.g. the feet) with scale 1, so other code can
 * tween it like a sprite; the inner `body` holds the display scale and flip.
 */
export class CharacterRig<P extends string> {
  readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly parts = new Map<P, LivePart>();
  private anchor: Point;
  private flipped = false;
  private pose: RigPose<P> = {};

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly atlas: RigAtlas,
    private readonly displayScale: number,
    parts: readonly CharacterPart<P>[],
    anchor: Point,
  ) {
    this.anchor = anchor;
    this.body = scene.add.container(0, 0).setScale(displayScale);
    this.root = scene.add.container(0, 0, [this.body]);
    this.setParts(parts, anchor);
  }

  /** Replaces every part (e.g. turning around changes art and draw order). */
  setParts(parts: readonly CharacterPart<P>[], anchor: Point = this.anchor): void {
    this.anchor = anchor;
    for (const live of this.parts.values()) live.image.destroy();
    this.parts.clear();
    for (const part of parts) {
      const image = this.scene.add.image(0, 0, this.atlas.key, part.frame);
      this.body.add(image);
      this.parts.set(part.name, { image, part, rest: this.place(image, part) });
    }
    this.applyPose(this.pose);
  }

  /** Swaps one part's art (e.g. an expression) without rebuilding the rig. */
  setFrame(name: P, frame: string, layout?: Partial<CharacterPart<P>>): void {
    const live = this.parts.get(name);
    if (!live || (live.part.frame === frame && !layout)) return;
    live.part = { ...live.part, ...layout, frame };
    live.image.setFrame(frame);
    live.rest = this.place(live.image, live.part);
    this.applyPose(this.pose);
  }

  frameOf(name: P): string | undefined {
    return this.parts.get(name)?.part.frame;
  }

  setFlip(flip: boolean): void {
    if (flip === this.flipped) return;
    this.flipped = flip;
    this.body.setScale(flip ? -this.displayScale : this.displayScale, this.displayScale);
  }

  setPartVisible(name: P, visible: boolean): void {
    this.parts.get(name)?.image.setVisible(visible);
  }

  applyPose(pose: RigPose<P>): void {
    this.pose = pose;
    const k = 1 / this.atlas.textureScale;
    for (const [name, { image, rest }] of this.parts) {
      const p = resolvePartPose(pose[name]);
      image.setPosition(rest.x + p.x, rest.y + p.y).setScale(p.scaleX * k, p.scaleY * k);
    }
  }

  destroy(): void {
    this.parts.clear();
    this.root.destroy();
  }

  private place(image: Phaser.GameObjects.Image, part: CharacterPart<string>): PartPlacement {
    const frame = this.atlas.frames[part.frame];
    const rest = framePlacement(part, frame, this.anchor);
    image.setOrigin(rest.originX, rest.originY);
    return rest;
  }
}
