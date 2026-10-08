import * as Phaser from "phaser";

import {
  SLEEPER_FACE_FRAMES,
  SLEEPER_FRAMES,
  SLEEPER_IMAGE_SCALE,
  SLEEPER_SOURCE_SCALE,
  SleeperLayout,
  type SleeperArtFace,
} from "@/game/art/characters/sleeper";
import { BedTextures, sleeperFaceKey } from "@/game/art/characterArt";
import { Fonts } from "@/game/config/theme";

type Part = Phaser.GameObjects.Image | Phaser.GameObjects.Container;

/**
 * How the Sleeper is drawn. The Sleeper entity animates `head`, `blanket` and
 * `arm` the same way for both looks (breathing, fidgets, waking), so the
 * timing that audio and gameplay rely on is shared.
 */
export interface SleeperLook {
  readonly head: Part;
  readonly blanket: Part;
  readonly arm: Part;
  /** Head rest position (world). */
  readonly headRest: { x: number; y: number };
  /** Whether the arm rises and falls with the blanket while breathing. */
  readonly armBreathes: boolean;
  /** Whether the arm moves with the blanket (true) or the head (false) when he sits up. */
  readonly armOnBlanket: boolean;
  /** How far the head lifts on each breath (px). */
  readonly headBreath: number;
  setFace(face: SleeperArtFace): void;
  /** One snore: the only snore effect shown (Zs, plus a bubble with the approved art). */
  snore(fxDepth: number): void;
}

interface Bed {
  cx: number;
  top: number;
  depth: number;
}

/** The generated (procedural) Sleeper: the fallback when the approved art is not loaded. */
export class GeneratedSleeperLook implements SleeperLook {
  readonly head: Phaser.GameObjects.Image;
  readonly blanket: Phaser.GameObjects.Image;
  readonly arm: Phaser.GameObjects.Image;
  readonly headRest: { x: number; y: number };
  readonly armBreathes = true;
  readonly armOnBlanket = true;
  readonly headBreath = 0;

  constructor(private readonly scene: Phaser.Scene, bed: Bed) {
    this.headRest = { x: bed.cx, y: bed.top + 40 };
    this.head = scene.add.image(this.headRest.x, this.headRest.y, sleeperFaceKey("calm")).setDepth(bed.depth + 0.2);
    this.blanket = scene.add.image(bed.cx, bed.top + 66, BedTextures.blanket).setOrigin(0.5, 0).setDepth(bed.depth + 0.3);
    this.arm = scene.add.image(bed.cx - 12, bed.top + 100, BedTextures.arm).setAngle(-6).setDepth(bed.depth + 0.4);
  }

  setFace(face: SleeperArtFace): void {
    this.head.setTexture(sleeperFaceKey(face === "snoring" ? "calm" : face));
  }

  /** A soft "z" drifting up and away from his head. */
  snore(fxDepth: number): void {
    const size = Phaser.Math.Between(16, 26);
    const z = this.scene.add
      .text(this.headRest.x + 26, this.headRest.y - 18, "z", {
        fontFamily: Fonts.display,
        fontSize: `${size}px`,
        fontStyle: "800",
        color: "#cfd6ff",
        stroke: "#1b1838",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(fxDepth)
      .setAlpha(0);
    floatAway(this.scene, z);
  }
}

/** The approved Sleeper art (head expressions, arm behind the head, top-down blanket). */
export class ArtSleeperLook implements SleeperLook {
  readonly head: Phaser.GameObjects.Container;
  readonly blanket: Phaser.GameObjects.Container;
  readonly arm: Phaser.GameObjects.Container;
  readonly headRest: { x: number; y: number };
  readonly armBreathes = false;
  readonly armOnBlanket = false;
  readonly headBreath = 0.8;
  private readonly face: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Image;
  private zIndex = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly atlasKey: string, bed: Bed) {
    const { collar, arm, blanketTop, blanketWidth, blanketMargin, snoreFrom } = SleeperLayout;
    const image = (frame: string) => scene.add.image(0, 0, atlasKey, frame).setScale(SLEEPER_IMAGE_SCALE);

    this.headRest = { x: bed.cx + collar.x, y: bed.top + collar.y };
    this.arm = scene.add.container(bed.cx + arm.x, bed.top + arm.y, [image("arm_over_head")]).setDepth(bed.depth + 0.15);

    this.face = image(SLEEPER_FACE_FRAMES.calm).setOrigin(0.5, 1);
    this.bubble = image("snore_bubble").setOrigin(0.1, 0.8).setPosition(snoreFrom.x, snoreFrom.y - collar.y).setVisible(false);
    this.head = scene.add.container(this.headRest.x, this.headRest.y, [this.face, this.bubble]).setDepth(bed.depth + 0.2);

    // The blanket image's (untrimmed) top-left sits one shadow margin outside the mattress.
    const frame = SLEEPER_FRAMES.blanket_topdown;
    const blanket = image("blanket_topdown")
      .setOrigin(0, 0)
      .setPosition(-blanketWidth / 2 - blanketMargin + frame.x * SLEEPER_SOURCE_SCALE, -blanketMargin + frame.y * SLEEPER_SOURCE_SCALE);
    this.blanket = scene.add.container(bed.cx, bed.top + blanketTop, [blanket]).setDepth(bed.depth + 0.3);
  }

  setFace(face: SleeperArtFace): void {
    this.face.setFrame(SLEEPER_FACE_FRAMES[face]);
  }

  /** An approved "Z" floats up while the nose bubble swells and pops. */
  snore(fxDepth: number): void {
    const scene = this.scene;
    const { snoreFrom } = SleeperLayout;
    scene.tweens.killTweensOf(this.bubble);
    this.bubble.setVisible(true).setAlpha(1).setScale(SLEEPER_IMAGE_SCALE * 0.2);
    scene.tweens.chain({
      targets: this.bubble,
      tweens: [
        { scale: SLEEPER_IMAGE_SCALE, duration: 650, ease: "Sine.easeOut" },
        { scale: SLEEPER_IMAGE_SCALE * 1.12, alpha: 0, duration: 160, ease: "Quad.easeIn" },
      ],
      onComplete: () => this.bubble.setVisible(false),
    });

    this.zIndex = (this.zIndex + 1) % 2;
    const z = scene.add
      .image(this.headRest.x + snoreFrom.x + 16, this.headRest.y - SleeperLayout.collar.y + snoreFrom.y - 30, this.atlasKey, this.zIndex ? "z_2" : "z_3")
      .setScale(SLEEPER_IMAGE_SCALE * Phaser.Math.FloatBetween(0.8, 1.05))
      .setDepth(fxDepth)
      .setAlpha(0);
    floatAway(scene, z);
  }
}

/** Drift up and to the right, fading in then out; destroyed at the end. */
function floatAway(scene: Phaser.Scene, target: Phaser.GameObjects.Image | Phaser.GameObjects.Text): void {
  scene.tweens.add({
    targets: target,
    x: target.x + 40,
    y: target.y - 50,
    duration: 2200,
    ease: "Sine.easeOut",
    onComplete: () => target.destroy(),
  });
  scene.tweens.chain({
    targets: target,
    tweens: [
      { alpha: 0.9, duration: 400 },
      { alpha: 0, duration: 1600 },
    ],
  });
}
