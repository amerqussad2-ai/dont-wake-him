import * as Phaser from "phaser";

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

  constructor() {
    super(SceneKeys.Hud);
  }

  create(data: HudStartData): void {
    this.tick = null;
    this.hud = new Hud(this, `LEVEL ${data.levelNumber} · ${data.levelName.toUpperCase()}`, data.objectives);
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [event, handler] of handlers) source.off(event, handler);
    });
  }

  update(_time: number, delta: number): void {
    if (!this.tick) return;
    this.hud.update(this.tick.noise, this.tick.sleepDepth, this.tick.alarmSeconds, delta / 1000);
  }

  private onIntroDone(): void {
    this.hud.show();
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

  /** "LEVEL 1 / THE BEDROOM / Don't wake him." shown while the camera moves in. */
  private createTitleCard(data: HudStartData, short: boolean): Phaser.GameObjects.Container {
    const style = { fontFamily: Fonts.primary, color: Colors.text };
    const card = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, [
      this.add
        .text(0, -46, `LEVEL ${data.levelNumber}`, { ...style, fontSize: "16px", color: Colors.mutedText })
        .setOrigin(0.5),
      this.add
        .text(0, 0, data.levelName.toUpperCase(), { ...style, fontSize: "52px", fontStyle: "bold" })
        .setOrigin(0.5),
      this.add
        .text(0, 46, "Don't wake him.", { ...style, fontSize: "18px", fontStyle: "italic", color: Colors.title })
        .setOrigin(0.5),
    ]);
    if (!short) {
      card.add(
        this.add
          .text(0, 250, "press any key to skip", { ...style, fontSize: "12px", color: Colors.mutedText })
          .setOrigin(0.5),
      );
    }
    card.setAlpha(0).setY(card.y + 16);
    this.tweens.add({ targets: card, alpha: 1, y: card.y - 16, duration: short ? 250 : 600, ease: "Cubic.easeOut" });
    return card;
  }
}
