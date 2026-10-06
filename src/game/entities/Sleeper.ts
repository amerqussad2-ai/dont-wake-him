import * as Phaser from "phaser";

import { FeelTuning } from "@/game/config/gameplay";
import { Colors, Fonts, Palette } from "@/game/config/theme";
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

/** The sleeping character on the bed. Purely visual; reacts to noise and wakes. */
export class Sleeper {
  private readonly scene: Phaser.Scene;
  private readonly hooks: SleeperHooks;
  private readonly head: Phaser.GameObjects.Container;
  private readonly eyes: Phaser.GameObjects.Rectangle[];
  private readonly blanket: Phaser.GameObjects.Rectangle;
  private readonly snore: Phaser.GameObjects.Text;
  private readonly headX: number;
  private readonly headY: number;
  private breathe: Phaser.Tweens.Tween;
  private stage: Stage = "calm";
  private fidgetTimer = 0;
  private awake = false;
  private snoring = false;

  constructor(scene: Phaser.Scene, bed: Rect, hooks: SleeperHooks = {}) {
    this.scene = scene;
    this.hooks = hooks;
    const cx = bed.x + bed.width / 2;
    this.headX = cx;
    this.headY = bed.y + 50;

    scene.add.rectangle(cx, bed.y + bed.height / 2, bed.width, bed.height, Palette.bedFrame);
    scene.add.rectangle(cx, bed.y + bed.height / 2 + 4, bed.width - 20, bed.height - 20, Palette.mattress);
    scene.add.rectangle(cx, bed.y + 45, bed.width - 60, 50, Palette.pillow);

    this.eyes = [-9, 9].map((dx) => scene.add.rectangle(dx, 2, 9, 2, 0x3a2a20));
    this.head = scene.add.container(this.headX, this.headY, [
      scene.add.circle(0, 0, 24, Palette.skin),
      ...this.eyes,
    ]);

    this.blanket = scene.add
      .rectangle(cx, bed.y + 110, bed.width - 30, bed.height - 110, Palette.blanket)
      .setOrigin(0.5, 0);
    this.breathe = this.startBreathing();

    this.snore = scene.add
      .text(cx + 30, bed.y + 10, "z z Z", {
        fontFamily: Fonts.primary,
        fontSize: "20px",
        color: Colors.mutedText,
      })
      .setOrigin(0, 1);
    scene.tweens.add({ targets: this.snore, y: bed.y - 6, alpha: 0.2, duration: 2000, repeat: -1 });
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
    this.snore.setVisible(this.snoring);

    // Occasional head turn while stirring.
    this.fidgetTimer -= deltaSeconds;
    if (this.stage !== "calm" && this.fidgetTimer <= 0) {
      this.fidgetTimer = this.stage === "restless" ? 1.1 : 2.6;
      this.hooks.fidget?.(this.stage);
      this.scene.tweens.add({
        targets: this.head,
        x: this.headX + Phaser.Math.Between(-8, 8),
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
    this.snore.setVisible(false);
    this.scene.tweens.killTweensOf(this.head);
    this.hooks.wakeBeat?.("gasp");

    // Eyes snap open.
    this.scene.tweens.add({
      targets: this.eyes,
      scaleY: 4,
      scaleX: 0.8,
      duration: 120,
      delay: 250,
      ease: "Back.easeOut",
      onStart: () => this.hooks.wakeBeat?.("eyes"),
    });
    // Sits up and throws the blanket off.
    this.scene.tweens.add({
      targets: this.head,
      x: this.headX,
      y: this.headY + 36,
      duration: 450,
      delay: 450,
      ease: "Back.easeOut",
      onStart: () => this.hooks.wakeBeat?.("sitUp"),
    });
    this.scene.tweens.add({
      targets: this.blanket,
      y: this.blanket.y + 70,
      scaleY: 0.7,
      angle: 4,
      duration: 450,
      delay: 450,
      ease: "Cubic.easeOut",
    });

    const alert = this.scene.add
      .text(this.headX, this.headY - 44, "!", {
        fontFamily: Fonts.primary,
        fontSize: "56px",
        fontStyle: "bold",
        color: Colors.danger,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setScale(0);
    this.scene.tweens.add({
      targets: alert,
      scale: 1,
      y: this.headY - 4,
      duration: 380,
      delay: 500,
      ease: "Back.easeOut",
      onStart: () => this.hooks.wakeBeat?.("alert"),
    });

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
    this.blanket.setScale(1).setAngle(0);
    this.head.x = this.headX;
    this.breathe = this.startBreathing();
    this.fidgetTimer = 0.3;

    if (escalating) {
      this.hooks.stirred?.(stage);
      this.say(stage === "restless" ? "hm?!" : "mm…", stage === "restless" ? Colors.danger : Colors.warning);
      this.scene.tweens.add({
        targets: this.blanket,
        angle: stage === "restless" ? 2.5 : 1.2,
        duration: 140,
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
      targets: this.blanket,
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

  /** Small speech bubble above the head. */
  private say(text: string, color: string): void {
    const bubble = this.scene.add
      .text(this.headX + 34, this.headY - 34, text, {
        fontFamily: Fonts.primary,
        fontSize: "16px",
        fontStyle: "bold",
        color,
        backgroundColor: "#0b0a12cc",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0, 1)
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
