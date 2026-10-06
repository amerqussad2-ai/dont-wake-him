import * as Phaser from "phaser";

import { addFootprintImage } from "@/game/art";
import { BedTextures, HEADBOARD, sleeperFaceKey } from "@/game/art/characterArt";
import { FxTextures } from "@/game/art/fxArt";
import { Depth, ySort } from "@/game/art/layers";
import { FeelTuning } from "@/game/config/gameplay";
import { Colors, Fonts } from "@/game/config/theme";
import type { Rect } from "@/game/types";

export type SleeperStage = "calm" | "stirring" | "restless";
type Stage = SleeperStage;

/** Moments in the wake-up animation, in order. */
export type WakeBeat = "gasp" | "eyes" | "sitUp" | "alert";

/** Optional callbacks, fired in sync with the sleeper's animations (used for audio). */
export interface SleeperHooks {
  breath?(phase: "in" | "out", stage: SleeperStage, snoring: boolean, durationMs: number): void;
  stirred?(stage: SleeperStage): void;
  fidget?(stage: SleeperStage): void;
  wakeBeat?(beat: WakeBeat): void;
}

const BREATH_MS: Record<Stage, number> = { calm: 1700, stirring: 950, restless: 480 };

/** Seconds between floating "z"s while he snores. */
const SNORE_Z_INTERVAL = 1.1;

/** The sleeping character in his bed. Purely visual; reacts to noise and wakes. */
export class Sleeper {
  private readonly scene: Phaser.Scene;
  private readonly hooks: SleeperHooks;
  private readonly head: Phaser.GameObjects.Image;
  private readonly blanket: Phaser.GameObjects.Image;
  private readonly arm: Phaser.GameObjects.Image;
  private readonly headX: number;
  private readonly headY: number;
  private readonly fxDepth: number;
  private breathe: Phaser.Tweens.Tween;
  private stage: Stage = "calm";
  private fidgetTimer = 0;
  private zTimer = 0;
  private awake = false;
  private snoring = false;

  constructor(scene: Phaser.Scene, bed: Rect, hooks: SleeperHooks = {}) {
    this.scene = scene;
    this.hooks = hooks;
    const cx = bed.x + bed.width / 2;
    this.headX = cx;
    this.headY = bed.y + 40;

    // The bed and everything on it share one depth band so they sort as a unit.
    const base = ySort(bed.y + bed.height);
    addFootprintImage(scene, BedTextures.bed, bed, 0, HEADBOARD).setDepth(base);
    scene.add.image(cx, bed.y + 36, BedTextures.pillow).setDepth(base + 0.1);
    this.head = scene.add.image(this.headX, this.headY, sleeperFaceKey("calm")).setDepth(base + 0.2);
    this.blanket = scene.add
      .image(cx, bed.y + 66, BedTextures.blanket)
      .setOrigin(0.5, 0)
      .setDepth(base + 0.3);
    this.arm = scene.add
      .image(cx - 12, bed.y + 100, BedTextures.arm)
      .setAngle(-6)
      .setDepth(base + 0.4);
    this.fxDepth = Depth.fx;

    this.breathe = this.startBreathing();
  }

  /** World position of the head, for camera framing. */
  get headPosition(): { x: number; y: number } {
    return { x: this.headX, y: this.headY };
  }

  /** Reacts to noise in three stages: calm, stirring, restless. */
  update(noise: number, sleepDepth: number, deltaSeconds: number): void {
    if (this.awake) return;

    const next = this.stageFor(noise);
    if (next !== this.stage) this.setStage(next);

    this.snoring = this.stage === "calm" && sleepDepth > 35;
    this.zTimer -= deltaSeconds;
    if (this.snoring && this.zTimer <= 0) {
      this.zTimer = SNORE_Z_INTERVAL;
      this.floatZ();
    }

    // Occasional head turn while stirring.
    this.fidgetTimer -= deltaSeconds;
    if (this.stage !== "calm" && this.fidgetTimer <= 0) {
      this.fidgetTimer = this.stage === "restless" ? 1.1 : 2.6;
      this.hooks.fidget?.(this.stage);
      this.scene.tweens.add({
        targets: this.head,
        x: this.headX + Phaser.Math.Between(-7, 7),
        duration: 260,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
  }

  /** Plays the wake-up sequence. Returns its duration in ms. */
  wake(): number {
    if (this.awake) return 0;
    this.awake = true;
    this.breathe.stop();
    this.scene.tweens.killTweensOf(this.head);
    this.head.setPosition(this.headX, this.headY);
    this.hooks.wakeBeat?.("gasp");

    // Eyes snap open.
    this.scene.tweens.add({
      targets: this.head,
      scale: 1.12,
      duration: 120,
      delay: 250,
      yoyo: true,
      ease: "Back.easeOut",
      onStart: () => {
        this.head.setTexture(sleeperFaceKey("awake"));
        this.hooks.wakeBeat?.("eyes");
      },
    });
    // Sits up and throws the blanket off.
    this.scene.tweens.add({
      targets: this.head,
      y: this.headY + 36,
      duration: 450,
      delay: 450,
      ease: "Back.easeOut",
      onStart: () => this.hooks.wakeBeat?.("sitUp"),
    });
    this.scene.tweens.add({
      targets: [this.blanket, this.arm],
      y: "+=70",
      scaleY: 0.75,
      duration: 450,
      delay: 450,
      ease: "Cubic.easeOut",
    });

    const flash = this.scene.add
      .image(this.headX, this.headY - 30, FxTextures.glow)
      .setTint(0xff4d5e)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.fxDepth)
      .setScale(0)
      .setAlpha(0.9);
    const alert = this.scene.add
      .text(this.headX, this.headY - 40, "!", {
        fontFamily: Fonts.display,
        fontSize: "60px",
        fontStyle: "900",
        color: "#ff5468",
        stroke: "#1a0a10",
        strokeThickness: 7,
      })
      .setOrigin(0.5, 1)
      .setDepth(this.fxDepth)
      .setScale(0);
    this.scene.tweens.add({
      targets: alert,
      scale: 1,
      y: this.headY - 2,
      duration: 380,
      delay: 500,
      ease: "Back.easeOut",
      onStart: () => this.hooks.wakeBeat?.("alert"),
    });
    this.scene.tweens.add({ targets: flash, scale: 2.4, alpha: 0, delay: 500, duration: 600, ease: "Cubic.easeOut" });

    return 1300;
  }

  private stageFor(noise: number): Stage {
    // Calming down needs a little margin so the stage does not flicker at a threshold.
    const margin = 4;
    const restlessAt = FeelTuning.restlessNoise - (this.stage === "restless" ? margin : 0);
    const stirAt = FeelTuning.stirNoise - (this.stage !== "calm" ? margin : 0);
    if (noise >= restlessAt) return "restless";
    if (noise >= stirAt) return "stirring";
    return "calm";
  }

  private setStage(stage: Stage): void {
    const escalating = stageRank(stage) > stageRank(this.stage);
    this.stage = stage;
    this.breathe.stop();
    this.blanket.setScale(1).setX(this.headX);
    this.arm.setScale(1);
    this.head.setPosition(this.headX, this.headY);
    this.head.setTexture(sleeperFaceKey(stage));
    this.breathe = this.startBreathing();
    this.fidgetTimer = 0.3;

    if (escalating) {
      this.hooks.stirred?.(stage);
      this.say(stage === "restless" ? "hm?!" : "mm…", stage === "restless" ? Colors.danger : Colors.warning);
      this.scene.tweens.add({
        targets: this.blanket,
        x: this.headX + (stage === "restless" ? 4 : 2),
        duration: 90,
        yoyo: true,
        repeat: 1,
      });
    }
  }

  /** Blanket rise and fall; also reports each inhale / exhale. */
  private startBreathing(): Phaser.Tweens.Tween {
    const duration = BREATH_MS[this.stage];
    const breath = (phase: "in" | "out") => {
      if (!this.awake) this.hooks.breath?.(phase, this.stage, this.snoring, duration);
    };
    return this.scene.tweens.add({
      targets: [this.blanket, this.arm],
      scaleY: this.stage === "restless" ? 1.05 : 1.03,
      duration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onStart: () => breath("in"),
      onRepeat: () => breath("in"),
      onYoyo: () => breath("out"),
    });
  }

  /** A soft "z" drifting up and away from his head. */
  private floatZ(): void {
    const size = Phaser.Math.Between(16, 26);
    const z = this.scene.add
      .text(this.headX + 26, this.headY - 18, "z", {
        fontFamily: Fonts.display,
        fontSize: `${size}px`,
        fontStyle: "800",
        color: "#cfd6ff",
        stroke: "#1b1838",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(this.fxDepth)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: z,
      x: z.x + 40,
      y: z.y - 50,
      duration: 2200,
      ease: "Sine.easeOut",
      onComplete: () => z.destroy(),
    });
    this.scene.tweens.chain({
      targets: z,
      tweens: [
        { alpha: 0.9, duration: 400 },
        { alpha: 0, duration: 1600 },
      ],
    });
  }

  /** Small speech bubble above the head. */
  private say(text: string, color: string): void {
    const bubble = this.scene.add
      .text(this.headX + 30, this.headY - 30, text, {
        fontFamily: Fonts.display,
        fontSize: "17px",
        fontStyle: "800",
        color,
        backgroundColor: "#141026ee",
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0, 1)
      .setDepth(this.fxDepth)
      .setScale(0);
    this.scene.tweens.chain({
      targets: bubble,
      tweens: [
        { scale: 1, duration: 180, ease: "Back.easeOut" },
        { alpha: 0, y: bubble.y - 12, delay: 900, duration: 400 },
      ],
      onComplete: () => bubble.destroy(),
    });
  }
}

function stageRank(stage: Stage): number {
  return stage === "calm" ? 0 : stage === "stirring" ? 1 : 2;
}
