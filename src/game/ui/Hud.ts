import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { FeelTuning } from "@/game/config/gameplay";
import { Colors, Fonts, Palette } from "@/game/config/theme";
import type { ObjectiveSnapshot } from "@/game/types";
import { lerpColor } from "@/game/ui/effects";
import { Meter } from "@/game/ui/Meter";

const BAR_HEIGHT = 96;
const textStyle = { fontFamily: Fonts.primary, fontSize: "14px", color: Colors.text };

/** Noise bar colour: green → yellow → red. */
function noiseColor(value: number): number {
  return value < 50
    ? lerpColor(Palette.noiseLow, Palette.noiseMid, value / 50)
    : lerpColor(Palette.noiseMid, Palette.noiseHigh, (value - 50) / 50);
}

/**
 * Heads-up display: meters, objectives, alarm timer, prompts and screen-space
 * effects (danger vignette, toasts). Lives in its own scene so camera moves and
 * shakes in the level never move the HUD.
 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly bar: Phaser.GameObjects.Container;
  private readonly noise: Meter;
  private readonly sleep: Meter;
  private readonly objectiveLines: Phaser.GameObjects.Text[];
  private readonly alarm: Phaser.GameObjects.Text;
  private readonly prompt: Phaser.GameObjects.Text;
  private readonly vignette: Phaser.GameObjects.Graphics;
  private promptText: string | null = null;
  private lastAlarmSecond = -1;
  private pulseTime = 0;

  constructor(scene: Phaser.Scene, levelLabel: string, objectives: readonly ObjectiveSnapshot[]) {
    this.scene = scene;

    this.vignette = this.createVignette();

    const background = scene.add
      .rectangle(0, 0, GAME_WIDTH, BAR_HEIGHT, Palette.wall, 0.94)
      .setOrigin(0);
    const title = scene.add.text(24, 14, levelLabel, { ...textStyle, color: Colors.mutedText });

    this.noise = new Meter(scene, {
      x: 24,
      y: 58,
      width: 260,
      height: 20,
      label: "NOISE",
      color: noiseColor,
    });
    this.sleep = new Meter(scene, {
      x: 320,
      y: 58,
      width: 200,
      height: 20,
      label: "SLEEP DEPTH",
      color: (v) => lerpColor(0x4a5199, Palette.sleep, v / 100),
    });

    this.alarm = scene.add.text(560, 56, "", { ...textStyle, fontSize: "18px" });
    const heading = scene.add.text(780, 12, "OBJECTIVES", textStyle);
    this.objectiveLines = objectives.map((o, i) =>
      scene.add.text(780, 33 + i * 20, `☐ ${o.text}`, textStyle),
    );

    this.bar = scene.add.container(0, 0, [
      background,
      title,
      this.noise.container,
      this.sleep.container,
      this.alarm,
      heading,
      ...this.objectiveLines,
    ]);

    this.prompt = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, "", {
        ...textStyle,
        fontSize: "18px",
        backgroundColor: "#000000aa",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);

    scene.add
      .text(GAME_WIDTH - 16, GAME_HEIGHT - 16, "Move: WASD / Arrows   Sneak: Shift   Interact: E / Space", {
        ...textStyle,
        fontSize: "12px",
        color: Colors.mutedText,
      })
      .setOrigin(1, 1);
  }

  /** Hides the top bar (before the intro finishes). */
  hide(): void {
    this.bar.setY(-BAR_HEIGHT).setAlpha(0);
  }

  /** Slides the top bar in. */
  show(): void {
    this.scene.tweens.add({ targets: this.bar, y: 0, alpha: 1, duration: 500, ease: "Cubic.easeOut" });
  }

  update(noise: number, sleepDepth: number, alarmSeconds: number | null, deltaSeconds: number): void {
    this.noise.setTarget(noise);
    this.sleep.setTarget(sleepDepth);
    this.noise.update(deltaSeconds);
    this.sleep.update(deltaSeconds);
    this.updateDanger(this.noise.displayed, deltaSeconds);
    this.updateAlarm(alarmSeconds);
  }

  onNoiseBurst(amount: number): void {
    this.noise.kick(amount);
  }

  onObjectiveComplete(objectives: readonly ObjectiveSnapshot[], id: string): void {
    const index = objectives.findIndex((o) => o.id === id);
    const line = this.objectiveLines[index];
    if (!line) return;
    line.setText(`☑ ${objectives[index].text}`).setColor(Colors.success);
    this.scene.tweens.add({
      targets: line,
      x: line.x + 8,
      duration: 160,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    const done = objectives.filter((o) => o.done).length;
    this.toast(`OBJECTIVE COMPLETE  ·  ${done}/${objectives.length}`, objectives[index].text);
  }

  /** Fades the prompt in and out. */
  setPrompt(text: string | null): void {
    if (text === this.promptText) return;
    const wasVisible = this.promptText !== null;
    this.promptText = text;
    this.scene.tweens.killTweensOf(this.prompt);

    if (text === null) {
      this.scene.tweens.add({ targets: this.prompt, alpha: 0, duration: 180 });
      return;
    }
    // Already showing: swap the text in place (it can change every frame).
    if (wasVisible) {
      this.prompt.setText(text).setAlpha(1).setY(GAME_HEIGHT - 16);
      return;
    }
    this.prompt.setText(text).setY(GAME_HEIGHT - 10);
    this.scene.tweens.add({
      targets: this.prompt,
      alpha: 1,
      y: GAME_HEIGHT - 16,
      duration: 220,
      ease: "Quad.easeOut",
    });
  }

  /** Full-screen colour flash, e.g. when he wakes up. */
  flash(color: number, alpha: number, duration: number): void {
    const flash = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, alpha)
      .setOrigin(0);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    });
  }

  /** Locks the vignette fully on, for the wake-up sequence. */
  alarmVignette(): void {
    this.scene.tweens.add({ targets: this.vignette, alpha: 1, duration: 300 });
  }

  /** Red edges and a warning meter that pulse faster as noise rises. */
  private updateDanger(noise: number, deltaSeconds: number): void {
    const danger = Phaser.Math.Clamp(
      (noise - FeelTuning.dangerNoise) / (100 - FeelTuning.dangerNoise),
      0,
      1,
    );
    this.pulseTime += deltaSeconds * (4 + danger * 8);
    const pulse = (Math.sin(this.pulseTime) + 1) / 2;
    if (!this.scene.tweens.isTweening(this.vignette)) {
      this.vignette.setAlpha(danger > 0 ? 0.25 + danger * 0.45 + pulse * 0.3 * danger : 0);
    }
    this.noise.setWarning(danger > 0 ? pulse : 0);
    this.noise.container.setScale(1 + (danger > 0 ? pulse * 0.02 : 0));
  }

  private updateAlarm(seconds: number | null): void {
    if (seconds === null) {
      if (this.lastAlarmSecond !== 0) {
        this.lastAlarmSecond = 0;
        this.alarm.setText("⏰ Alarm off").setColor(Colors.success);
        this.scene.tweens.add({ targets: this.alarm, scale: 1.2, duration: 150, yoyo: true });
      }
      return;
    }
    const s = Math.ceil(seconds);
    if (s === this.lastAlarmSecond) return;
    this.lastAlarmSecond = s;
    const urgent = s <= FeelTuning.alarmUrgentSeconds;
    this.alarm.setText(`⏰ Alarm in ${s}s`).setColor(urgent ? Colors.danger : Colors.text);
    if (urgent) {
      this.alarm.setScale(1.15);
      this.scene.tweens.add({ targets: this.alarm, scale: 1, duration: 300, ease: "Quad.easeOut" });
    }
  }

  private toast(title: string, detail: string): void {
    const x = GAME_WIDTH / 2;
    const box = this.scene.add.container(x, BAR_HEIGHT - 40, [
      this.scene.add
        .rectangle(0, 0, 440, 56, 0x0b0a12, 0.92)
        .setStrokeStyle(2, Palette.noiseLow, 0.8),
      this.scene.add
        .text(0, -12, title, { ...textStyle, fontStyle: "bold", color: Colors.success })
        .setOrigin(0.5),
      this.scene.add.text(0, 11, detail, { ...textStyle, fontSize: "13px" }).setOrigin(0.5),
    ]);
    box.setAlpha(0);
    this.scene.tweens.chain({
      targets: box,
      tweens: [
        { y: BAR_HEIGHT + 40, alpha: 1, duration: 320, ease: "Back.easeOut" },
        { y: BAR_HEIGHT - 40, alpha: 0, delay: 1500, duration: 260, ease: "Quad.easeIn" },
      ],
      onComplete: () => box.destroy(),
    });
  }

  /** Red edges built from nested translucent strokes. */
  private createVignette(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const inset = i * 9;
      g.lineStyle(10, Palette.noiseHigh, 0.32 * (1 - i / steps));
      g.strokeRect(inset, inset, GAME_WIDTH - inset * 2, GAME_HEIGHT - inset * 2);
    }
    return g.setAlpha(0);
  }
}
