import * as Phaser from "phaser";

import { addFootprintImage } from "@/game/art";
import { externalTextureKey } from "@/game/art/ArtProvider";
import { BedTextures, HEADBOARD } from "@/game/art/characterArt";
import { CharacterAtlases } from "@/game/art/characters/atlases";
import { FxTextures } from "@/game/art/fxArt";
import { Depth, ySort } from "@/game/art/layers";
import { FeelTuning } from "@/game/config/gameplay";
import { Colors, Fonts } from "@/game/config/theme";
import { ArtSleeperLook, GeneratedSleeperLook, type SleeperLook } from "@/game/entities/sleeperVisuals";
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

/** Seconds between snores (floating "z"s) while he snores. */
const SNORE_Z_INTERVAL = 1.1;

type Part = Phaser.GameObjects.Image | Phaser.GameObjects.Container;

/**
 * The sleeping character in his bed. Purely visual; reacts to noise and wakes.
 * Drawn with the approved art when its atlas loaded, otherwise the generated art.
 */
export class Sleeper {
  private readonly scene: Phaser.Scene;
  private readonly hooks: SleeperHooks;
  private readonly look: SleeperLook;
  private readonly head: Part;
  private readonly blanket: Part;
  private readonly arm: Part;
  private readonly headX: number;
  private readonly headY: number;
  /** Centre of his face, for the camera and speech bubbles. */
  private readonly focus: { x: number; y: number };
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
    this.focus = { x: cx, y: bed.y + 40 };

    // The bed and everything on it share one depth band so they sort as a unit.
    const base = ySort(bed.y + bed.height);
    addFootprintImage(scene, BedTextures.bed, bed, 0, HEADBOARD).setDepth(base);
    scene.add.image(cx, bed.y + 36, BedTextures.pillow).setDepth(base + 0.1);
    const atlas = externalTextureKey(CharacterAtlases.sleeper);
    const place = { cx, top: bed.y, depth: base };
    this.look = scene.textures.exists(atlas) ? new ArtSleeperLook(scene, atlas, place) : new GeneratedSleeperLook(scene, place);
    ({ head: this.head, blanket: this.blanket, arm: this.arm } = this.look);
    this.headX = this.look.headRest.x;
    this.headY = this.look.headRest.y;
    this.fxDepth = Depth.fx;

    this.breathe = this.startBreathing();
  }

  /** World position of the head, for camera framing. */
  get headPosition(): { x: number; y: number } {
    return { ...this.focus };
  }

  /** Reacts to noise in three stages: calm, stirring, restless. */
  update(noise: number, sleepDepth: number, deltaSeconds: number): void {
    if (this.awake) return;

    const next = this.stageFor(noise);
    if (next !== this.stage) this.setStage(next);

    const snoring = this.stage === "calm" && sleepDepth > 35;
    if (snoring !== this.snoring) {
      this.snoring = snoring;
      if (this.stage === "calm") this.look.setFace(snoring ? "snoring" : "calm");
    }
    this.zTimer -= deltaSeconds;
    if (this.snoring && this.zTimer <= 0) {
      this.zTimer = SNORE_Z_INTERVAL;
      this.look.snore(this.fxDepth);
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
        this.look.setFace("awake");
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
      targets: this.look.armOnBlanket ? [this.blanket, this.arm] : [this.blanket],
      y: "+=70",
      scaleY: 0.75,
      duration: 450,
      delay: 450,
      ease: "Cubic.easeOut",
    });
    if (!this.look.armOnBlanket) {
      this.scene.tweens.add({ targets: this.arm, y: "+=36", duration: 450, delay: 450, ease: "Back.easeOut" });
    }

    const flash = this.scene.add
      .image(this.focus.x, this.focus.y - 30, FxTextures.glow)
      .setTint(0xff4d5e)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.fxDepth)
      .setScale(0)
      .setAlpha(0.9);
    const alert = this.scene.add
      .text(this.focus.x, this.focus.y - 40, "!", {
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
      y: this.focus.y - 2,
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
    this.look.setFace(stage === "calm" && this.snoring ? "snoring" : stage);
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

  /** Blanket rise and fall (and a small head lift); also reports each inhale / exhale. */
  private startBreathing(): Phaser.Tweens.Tween {
    const duration = BREATH_MS[this.stage];
    const breath = (phase: "in" | "out") => {
      if (!this.awake) this.hooks.breath?.(phase, this.stage, this.snoring, duration);
    };
    const rise = this.stage === "restless" ? 0.05 : 0.03;
    const chest = this.look.armBreathes ? [this.blanket, this.arm] : [this.blanket];
    const breathing = { t: 0 };
    return this.scene.tweens.add({
      targets: breathing,
      t: 1,
      onUpdate: () => {
        for (const part of chest) part.scaleY = 1 + rise * breathing.t;
        if (this.look.headBreath) this.head.y = this.headY - this.look.headBreath * breathing.t;
      },
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
      .text(this.focus.x + 30, this.focus.y - 30, text, {
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
