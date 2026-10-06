import * as Phaser from "phaser";

import { getAudio } from "@/game/audio";
import { AudioSettings } from "@/game/config/audio";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors, Fonts, Palette } from "@/game/config/theme";
import {
  LevelEvents,
  SceneKeys,
  type HudStartData,
  type LevelTick,
  type LoseReason,
  type ObjectiveSnapshot,
} from "@/game/types";
import { Hud } from "@/game/ui/Hud";

/**
 * Screen-space UI drawn above the level. Listens to the level's events, so the
 * level never has to know how the HUD looks.
 */
export class HudScene extends Phaser.Scene {
  private hud!: Hud;
  private tick: LevelTick | null = null;
  private titleCard: Phaser.GameObjects.Container | null = null;
  private letterbox: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super(SceneKeys.Hud);
  }

  create(data: HudStartData): void {
    this.tick = null;
    this.hud = new Hud(this, data.objectives);
    this.hud.hide();
    this.titleCard = this.createTitleCard(data, data.quickStart);

    const source = data.events;
    const handlers: [string, (...args: never[]) => void][] = [
      [LevelEvents.Tick, (tick: LevelTick) => (this.tick = tick)],
      [LevelEvents.IntroDone, () => this.onIntroDone()],
      [LevelEvents.Prompt, (text: string | null) => this.hud.setPrompt(text)],
      [LevelEvents.NoiseBurst, (amount: number) => this.hud.onNoiseBurst(amount)],
      [
        LevelEvents.ObjectiveComplete,
        (objectives: readonly ObjectiveSnapshot[], id: string) =>
          this.hud.onObjectiveComplete(objectives, id),
      ],
      [LevelEvents.Ended, (outcome: LoseReason | "win") => this.onEnded(outcome)],
    ];
    for (const [event, handler] of handlers) source.on(event, handler);
    const stopAudioControls = this.setupAudioControls();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [event, handler] of handlers) source.off(event, handler);
      stopAudioControls();
    });
  }

  /** M toggles mute, - / + change master volume. Returns a cleanup function. */
  private setupAudioControls(): () => void {
    const audio = getAudio(this);
    const show = (highlight: boolean) => {
      const s = audio.snapshot;
      this.hud.setAudioStatus(s.master, s.muted, s.unlocked, highlight);
    };
    const changeVolume = (direction: number) => {
      audio.setMuted(false);
      audio.setVolume("master", audio.snapshot.master + direction * AudioSettings.volumeStep);
      audio.play("uiToggle", { pitch: 0.8 + audio.snapshot.master * 0.5 });
      show(true);
    };
    const keyboard = this.input.keyboard;
    keyboard?.on("keydown-M", () => {
      audio.toggleMute();
      if (!audio.snapshot.muted) audio.play("uiToggle");
      show(true);
    });
    for (const key of ["keydown-MINUS", "keydown-NUMPAD_SUBTRACT"]) keyboard?.on(key, () => changeVolume(-1));
    for (const key of ["keydown-PLUS", "keydown-NUMPAD_ADD"]) keyboard?.on(key, () => changeVolume(1));

    show(false);
    // Picks up the moment audio unlocks after the first key press.
    return audio.onChange(() => show(false));
  }

  update(_time: number, delta: number): void {
    if (!this.tick) return;
    this.hud.update(this.tick.noise, this.tick.sleepDepth, this.tick.alarmSeconds, delta / 1000);
    this.hud.avoid(this.tick.playerScreen, delta / 1000);
  }

  private onIntroDone(): void {
    this.hud.show();
    for (const [i, bar] of this.letterbox.entries()) {
      this.tweens.add({ targets: bar, y: i === 0 ? -bar.height : GAME_HEIGHT, duration: 500, ease: "Cubic.easeIn" });
    }
    const card = this.titleCard;
    this.titleCard = null;
    if (!card) return;
    this.tweens.add({
      targets: card,
      alpha: 0,
      y: card.y - 20,
      duration: 350,
      onComplete: () => card.destroy(),
    });
  }

  private onEnded(outcome: LoseReason | "win"): void {
    this.hud.setPrompt(null);
    if (outcome === "win") {
      this.hud.flash(Palette.noiseLow, 0.18, 600);
    } else {
      this.hud.flash(Palette.noiseHigh, 0.45, 700);
      this.hud.alarmVignette();
    }
  }

  /** Cinematic title card with letterbox bars, shown while the camera moves in. */
  private createTitleCard(data: HudStartData, short: boolean): Phaser.GameObjects.Container {
    const barHeight = 64;
    this.letterbox = [
      this.add.rectangle(0, 0, GAME_WIDTH, barHeight, 0x000000).setOrigin(0),
      this.add.rectangle(0, GAME_HEIGHT - barHeight, GAME_WIDTH, barHeight, 0x000000).setOrigin(0),
    ];
    if (short) for (const bar of this.letterbox) bar.setVisible(false);

    const kicker = this.add
      .text(0, -58, `LEVEL ${data.levelNumber}`, {
        fontFamily: Fonts.primary,
        fontSize: "13px",
        fontStyle: "600",
        color: "#f2c983",
      })
      .setOrigin(0.5)
      .setLetterSpacing(6);
    const title = this.add
      .text(0, 0, data.levelName.toUpperCase(), {
        fontFamily: Fonts.display,
        fontSize: "58px",
        fontStyle: "800",
        color: "#f4f0ff",
      })
      .setOrigin(0.5)
      .setLetterSpacing(8);
    title.setShadow(0, 6, "rgba(0, 0, 0, 0.6)", 18, false, true);
    const lineWidth = title.width * 0.45;
    const left = this.add.rectangle(-12, 52, lineWidth, 1, 0xf2c983, 0.6).setOrigin(1, 0.5);
    const right = this.add.rectangle(12, 52, lineWidth, 1, 0xf2c983, 0.6).setOrigin(0, 0.5);
    const tagline = this.add
      .text(0, 52, "don't wake him", {
        fontFamily: Fonts.primary,
        fontSize: "15px",
        fontStyle: "italic",
        color: Colors.title,
      })
      .setOrigin(0.5);
    left.setX(-tagline.width / 2 - 14);
    right.setX(tagline.width / 2 + 14);

    const card = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, [kicker, title, left, right, tagline]);
    if (!short) {
      card.add(
        this.add
          .text(0, GAME_HEIGHT / 2 - 18, "PRESS ANY KEY TO SKIP", {
            fontFamily: Fonts.primary,
            fontSize: "11px",
            color: Colors.mutedText,
          })
          .setOrigin(0.5)
          .setLetterSpacing(3),
      );
    }
    card.setAlpha(0).setScale(0.96);
    this.tweens.add({
      targets: card,
      alpha: 1,
      scale: 1,
      duration: short ? 250 : 900,
      ease: "Cubic.easeOut",
    });
    return card;
  }
}
