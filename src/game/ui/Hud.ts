import * as Phaser from "phaser";

import { FxTextures, panelTexture, UiTextures } from "@/game/art/fxArt";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { FeelTuning } from "@/game/config/gameplay";
import { Colors, Fonts } from "@/game/config/theme";
import type { ObjectiveSnapshot } from "@/game/types";
import { smoothing } from "@/game/ui/effects";
import { Meter } from "@/game/ui/Meter";

const MARGIN = 20;
const STATUS = { width: 304, height: 150 };
const GOALS = { width: 340, rowHeight: 28 };
const muted = { fontFamily: Fonts.primary, fontSize: "11px", color: Colors.mutedText };
const body = { fontFamily: Fonts.primary, fontSize: "14px", color: Colors.text };

function sleepWord(depth: number): string {
  return depth >= 65 ? "DEEP" : depth >= 35 ? "LIGHT" : "SHALLOW";
}

function formatTime(seconds: number): string {
  const s = Math.ceil(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Heads-up display: a status card (noise, sleep, alarm), an objectives card,
 * contextual prompts and screen-space effects. Lives in its own scene so camera
 * moves and shakes in the level never move it.
 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly status: Phaser.GameObjects.Container;
  private readonly goals: Phaser.GameObjects.Container;
  private readonly noise: Meter;
  private readonly sleep: Meter;
  private readonly alarmIcon: Phaser.GameObjects.Image;
  private readonly alarmLabel: Phaser.GameObjects.Text;
  private readonly alarmTime: Phaser.GameObjects.Text;
  private readonly goalRows: { check: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; strike: Phaser.GameObjects.Rectangle }[];
  private readonly goalCount: Phaser.GameObjects.Text;
  private readonly prompt: Phaser.GameObjects.Container;
  private readonly promptBg: Phaser.GameObjects.Graphics;
  private readonly promptKey: Phaser.GameObjects.Image;
  private readonly promptLock: Phaser.GameObjects.Image;
  private readonly promptText: Phaser.GameObjects.Text;
  private readonly danger: Phaser.GameObjects.Image;
  private readonly audioLabel: Phaser.GameObjects.Text;
  private readonly goalsHeight: number;
  private currentPrompt: string | null = null;
  private lastAlarmSecond = -1;
  private pulseTime = 0;
  private dangerLocked = false;
  /** Cards only fade for the player once they have slid in. */
  private cardsReady = false;

  constructor(scene: Phaser.Scene, objectives: readonly ObjectiveSnapshot[]) {
    this.scene = scene;

    // Cinematic vignette always, red danger edges on top when it gets loud.
    scene.add.image(0, 0, FxTextures.vignette).setOrigin(0).setAlpha(0.75);
    this.danger = scene.add.image(0, 0, FxTextures.danger).setOrigin(0).setAlpha(0);

    // --- Status card -------------------------------------------------------
    const statusPanel = scene.add.image(-16, -16, panelTexture(scene, STATUS.width, STATUS.height)).setOrigin(0);
    this.noise = new Meter(scene, {
      x: 20,
      y: 26,
      label: "NOISE",
      icon: UiTextures.iconNoise,
      iconTint: 0xf5c451,
      fill: UiTextures.barNoise,
    });
    this.sleep = new Meter(scene, {
      x: 20,
      y: 72,
      label: "SLEEP DEPTH",
      icon: UiTextures.iconMoon,
      iconTint: 0xa6b4ff,
      fill: UiTextures.barSleep,
      format: (v) => `${sleepWord(v)}  ${Math.round(v)}`,
    });
    const divider = scene.add.rectangle(20, 112, STATUS.width - 40, 1, 0xffffff, 0.08).setOrigin(0);
    this.alarmIcon = scene.add.image(28, 132, UiTextures.iconClock).setScale(0.8).setTint(0xff8a80);
    this.alarmLabel = scene.add.text(44, 126, "ALARM RINGS IN", muted).setLetterSpacing(1.6);
    this.alarmTime = scene.add
      .text(STATUS.width - 20, 132, "", {
        fontFamily: Fonts.display,
        fontSize: "22px",
        fontStyle: "800",
        color: Colors.text,
      })
      .setOrigin(1, 0.5);
    this.status = scene.add.container(MARGIN, MARGIN, [
      statusPanel,
      this.noise.container,
      this.sleep.container,
      divider,
      this.alarmIcon,
      this.alarmLabel,
      this.alarmTime,
    ]);

    // --- Objectives card ---------------------------------------------------
    const goalsHeight = 46 + objectives.length * GOALS.rowHeight;
    this.goalsHeight = goalsHeight;
    const goalsPanel = scene.add.image(-16, -16, panelTexture(scene, GOALS.width, goalsHeight)).setOrigin(0);
    const heading = scene.add.text(20, 16, "OBJECTIVES", muted).setLetterSpacing(2);
    this.goalCount = scene.add
      .text(GOALS.width - 20, 14, "", { ...body, fontSize: "13px", fontStyle: "700" })
      .setOrigin(1, 0);
    this.goalRows = objectives.map((o, i) => {
      const y = 50 + i * GOALS.rowHeight;
      const check = scene.add.image(30, y, UiTextures.checkEmpty);
      const text = scene.add.text(48, y, o.text, body).setOrigin(0, 0.5);
      const strike = scene.add.rectangle(48, y + 1, 0, 1.5, 0xffffff, 0.5).setOrigin(0, 0.5);
      return { check, text, strike };
    });
    this.goals = scene.add.container(GAME_WIDTH - MARGIN - GOALS.width, MARGIN, [
      goalsPanel,
      heading,
      this.goalCount,
      ...this.goalRows.flatMap((r) => [r.check, r.text, r.strike]),
    ]);
    this.updateGoalCount(objectives);

    // --- Prompt pill --------------------------------------------------------
    this.promptBg = scene.add.graphics();
    this.promptKey = scene.add.image(0, 0, UiTextures.keycap).setScale(0.85);
    this.promptLock = scene.add.image(0, 0, UiTextures.iconLock).setTint(0xff8a96);
    this.promptText = scene.add.text(0, 0, "", { ...body, fontSize: "16px" }).setOrigin(0, 0.5);
    this.prompt = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT - 44, [this.promptBg, this.promptKey, this.promptLock, this.promptText])
      .setAlpha(0);

    // --- Footer -------------------------------------------------------------
    scene.add
      .text(GAME_WIDTH - MARGIN, GAME_HEIGHT - 12, "WASD / Arrows move  ·  Shift sneak  ·  E interact", {
        ...muted,
        color: "#8f8aa8",
      })
      .setOrigin(1, 1)
      .setAlpha(0.8);
    this.audioLabel = scene.add.text(MARGIN, GAME_HEIGHT - 12, "", { ...muted, color: "#8f8aa8" }).setOrigin(0, 1).setAlpha(0.8);
  }

  /** Hides the cards (before the intro finishes). */
  hide(): void {
    this.status.setX(-STATUS.width - 40).setAlpha(0);
    this.goals.setX(GAME_WIDTH + 40).setAlpha(0);
  }

  /** Slides the cards in. */
  show(): void {
    this.scene.tweens.add({
      targets: this.status,
      x: MARGIN,
      alpha: 1,
      duration: 600,
      ease: "Cubic.easeOut",
      onComplete: () => (this.cardsReady = true),
    });
    this.scene.tweens.add({
      targets: this.goals,
      x: GAME_WIDTH - MARGIN - GOALS.width,
      alpha: 1,
      duration: 600,
      delay: 120,
      ease: "Cubic.easeOut",
    });
  }

  update(noise: number, sleepDepth: number, alarmSeconds: number | null, deltaSeconds: number): void {
    this.noise.setTarget(noise);
    this.sleep.setTarget(sleepDepth);
    this.noise.update(deltaSeconds);
    this.sleep.update(deltaSeconds);
    this.updateDanger(this.noise.displayed, deltaSeconds);
    this.updateAlarm(alarmSeconds);
  }

  /** Fades a card down when the player walks behind it. */
  avoid(player: { x: number; y: number }, deltaSeconds: number): void {
    if (!this.cardsReady) return;
    const k = smoothing(8, deltaSeconds);
    const near = (c: Phaser.GameObjects.Container, w: number, h: number) =>
      player.x > c.x - 30 && player.x < c.x + w + 30 && player.y > c.y - 30 && player.y < c.y + h + 60;
    const fade = (c: Phaser.GameObjects.Container, w: number, h: number) =>
      c.setAlpha(c.alpha + ((near(c, w, h) ? 0.28 : 1) - c.alpha) * k);
    fade(this.status, STATUS.width, STATUS.height);
    fade(this.goals, GOALS.width, this.goalsHeight);
  }

  onNoiseBurst(amount: number): void {
    this.noise.kick(amount);
  }

  onObjectiveComplete(objectives: readonly ObjectiveSnapshot[], id: string): void {
    const index = objectives.findIndex((o) => o.id === id);
    const row = this.goalRows[index];
    if (!row) return;
    row.check.setTexture(UiTextures.checkDone).setScale(0);
    this.scene.tweens.add({ targets: row.check, scale: 1, duration: 320, ease: "Back.easeOut" });
    row.text.setColor(Colors.mutedText);
    this.scene.tweens.add({ targets: row.strike, width: row.text.width, duration: 300, ease: "Cubic.easeOut" });
    this.updateGoalCount(objectives);
    this.scene.tweens.add({ targets: this.goalCount, scale: 1.3, duration: 150, yoyo: true });

    const done = objectives.filter((o) => o.done).length;
    this.toast(`OBJECTIVE COMPLETE  ·  ${done}/${objectives.length}`, objectives[index].text);
  }

  /** Fades the prompt pill in and out; "[E] ..." prompts get a keycap, hints a lock. */
  setPrompt(text: string | null): void {
    if (text === this.currentPrompt) return;
    const wasVisible = this.currentPrompt !== null;
    this.currentPrompt = text;
    this.scene.tweens.killTweensOf(this.prompt);

    if (text === null) {
      this.scene.tweens.add({ targets: this.prompt, alpha: 0, duration: 180 });
      return;
    }
    this.layoutPrompt(text);
    if (wasVisible) {
      this.prompt.setAlpha(1).setY(GAME_HEIGHT - 44);
      return;
    }
    this.prompt.setY(GAME_HEIGHT - 36);
    this.scene.tweens.add({ targets: this.prompt, alpha: 1, y: GAME_HEIGHT - 44, duration: 220, ease: "Quad.easeOut" });
  }

  /** Full-screen colour flash, e.g. when he wakes up. */
  flash(color: number, alpha: number, duration: number): void {
    const flash = this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, alpha).setOrigin(0);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration, onComplete: () => flash.destroy() });
  }

  /** Locks the red edges fully on, for the wake-up sequence. */
  alarmVignette(): void {
    this.dangerLocked = true;
    this.scene.tweens.add({ targets: this.danger, alpha: 1, duration: 300 });
  }

  /** Bottom-left sound status, e.g. "Sound 80%  ·  M mute  ·  -/+ volume". */
  setAudioStatus(volume: number, muted: boolean, unlocked: boolean, highlight: boolean): void {
    const level = muted ? "muted" : `${Math.round(volume * 100)}%`;
    const hint = unlocked ? "M mute  ·  -/+ volume" : "press any key to enable sound";
    this.audioLabel.setText(`${muted ? "🔇" : "🔊"}  Sound ${level}   ·   ${hint}`);
    if (highlight) {
      this.scene.tweens.killTweensOf(this.audioLabel);
      this.audioLabel.setAlpha(1).setColor(Colors.text);
      this.scene.tweens.add({
        targets: this.audioLabel,
        alpha: 0.8,
        duration: 600,
        onComplete: () => this.audioLabel.setColor("#8f8aa8"),
      });
    }
  }

  // --- Internals -----------------------------------------------------------

  private layoutPrompt(text: string): void {
    const action = text.startsWith("[E] ");
    const locked = !action && /locked|first|not yet/i.test(text);
    const label = action ? text.slice(4) : text;
    this.promptText.setText(label).setColor(locked ? "#ffc2c8" : Colors.text);
    const iconWidth = action || locked ? 34 : 0;
    const width = this.promptText.width + iconWidth + 36;
    const left = -width / 2;

    this.promptKey.setVisible(action).setPosition(left + 30, 0);
    this.promptLock.setVisible(locked).setPosition(left + 30, 0);
    this.promptText.setPosition(left + 18 + iconWidth, 0);
    this.promptBg.clear();
    this.promptBg.fillStyle(0x0e0b1c, 0.88);
    this.promptBg.fillRoundedRect(left, -22, width, 44, 22);
    this.promptBg.lineStyle(1, locked ? 0xff6b7a : 0xffffff, locked ? 0.5 : 0.14);
    this.promptBg.strokeRoundedRect(left, -22, width, 44, 22);
  }

  private updateGoalCount(objectives: readonly ObjectiveSnapshot[]): void {
    const done = objectives.filter((o) => o.done).length;
    this.goalCount.setText(`${done} / ${objectives.length}`).setColor(done === objectives.length ? Colors.success : Colors.text);
  }

  /** Red edges and a warning meter that pulse faster as noise rises. */
  private updateDanger(noise: number, deltaSeconds: number): void {
    const danger = Phaser.Math.Clamp((noise - FeelTuning.dangerNoise) / (100 - FeelTuning.dangerNoise), 0, 1);
    this.pulseTime += deltaSeconds * (4 + danger * 8);
    const pulse = (Math.sin(this.pulseTime) + 1) / 2;
    if (!this.dangerLocked) this.danger.setAlpha(danger > 0 ? 0.25 + danger * 0.35 + pulse * 0.25 * danger : 0);
    this.noise.setWarning(danger > 0 ? pulse : 0);
  }

  private updateAlarm(seconds: number | null): void {
    if (seconds === null) {
      if (this.lastAlarmSecond !== 0) {
        this.lastAlarmSecond = 0;
        this.alarmLabel.setText("ALARM").setColor(Colors.mutedText);
        this.alarmIcon.setTint(0x4fe0a0);
        this.alarmTime.setText("OFF").setColor(Colors.success);
        this.scene.tweens.add({ targets: this.alarmTime, scale: 1.25, duration: 160, yoyo: true });
      }
      return;
    }
    const s = Math.ceil(seconds);
    if (s === this.lastAlarmSecond) return;
    this.lastAlarmSecond = s;
    const urgent = s <= FeelTuning.alarmUrgentSeconds;
    this.alarmTime.setText(formatTime(seconds)).setColor(urgent ? "#ff6b7a" : Colors.text);
    this.alarmLabel.setColor(urgent ? Colors.danger : Colors.mutedText);
    if (urgent) {
      this.alarmTime.setScale(1.2);
      this.scene.tweens.add({ targets: this.alarmTime, scale: 1, duration: 300, ease: "Quad.easeOut" });
      this.scene.tweens.add({ targets: this.alarmIcon, angle: 12, duration: 50, yoyo: true, repeat: 3 });
    }
  }

  private toast(title: string, detail: string): void {
    const titleText = this.scene.add
      .text(0, -9, title, { ...body, fontSize: "12px", fontStyle: "700", color: Colors.success })
      .setOrigin(0.5)
      .setLetterSpacing(1.5);
    const detailText = this.scene.add.text(0, 11, detail, { ...body, fontSize: "14px" }).setOrigin(0.5);
    const width = Math.max(titleText.width, detailText.width) + 80;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0e0b1c, 0.92);
    bg.fillRoundedRect(-width / 2, -26, width, 52, 26);
    bg.lineStyle(1.5, 0x4fe0a0, 0.6);
    bg.strokeRoundedRect(-width / 2, -26, width, 52, 26);
    const check = this.scene.add.image(-width / 2 + 26, 0, UiTextures.checkDone);
    const box = this.scene.add.container(GAME_WIDTH / 2, -40, [bg, check, titleText, detailText]);
    this.scene.tweens.chain({
      targets: box,
      tweens: [
        { y: 46, duration: 380, ease: "Back.easeOut" },
        { y: -40, delay: 1600, duration: 280, ease: "Quad.easeIn" },
      ],
      onComplete: () => box.destroy(),
    });
  }
}
