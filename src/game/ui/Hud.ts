import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors, Fonts, Palette } from "@/game/config/theme";
import type { Objective } from "@/game/systems/ObjectiveSystem";
import { Meter } from "@/game/ui/Meter";

/**
 * In-canvas heads-up display: meters, objectives, alarm timer and prompts.
 * Create it after the room so it draws on top.
 */
export class Hud {
  private readonly noise: Meter;
  private readonly sleep: Meter;
  private readonly objectives: Phaser.GameObjects.Text;
  private readonly alarm: Phaser.GameObjects.Text;
  private readonly prompt: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, levelName: string) {
    const style = { fontFamily: Fonts.primary, fontSize: "14px", color: Colors.text };

    scene.add.rectangle(0, 0, GAME_WIDTH, 96, Palette.wall).setOrigin(0);
    scene.add.text(24, 14, `LEVEL 1 · ${levelName.toUpperCase()}`, {
      ...style,
      color: Colors.mutedText,
    });

    this.noise = new Meter(scene, {
      x: 24,
      y: 58,
      width: 260,
      height: 20,
      label: "NOISE",
      color: (v) => (v < 50 ? Palette.noiseLow : v < 80 ? Palette.noiseMid : Palette.noiseHigh),
    });
    this.sleep = new Meter(scene, {
      x: 320,
      y: 58,
      width: 200,
      height: 20,
      label: "SLEEP DEPTH",
      color: () => Palette.sleep,
    });

    this.alarm = scene.add.text(560, 56, "", { ...style, fontSize: "18px" });
    this.objectives = scene.add.text(780, 12, "", { ...style, lineSpacing: 4 });

    this.prompt = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, "", {
        ...style,
        fontSize: "18px",
        backgroundColor: "#000000aa",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 1);

    scene.add
      .text(GAME_WIDTH - 16, GAME_HEIGHT - 16, "Move: WASD / Arrows   Sneak: Shift   Interact: E / Space", {
        ...style,
        fontSize: "12px",
        color: Colors.mutedText,
      })
      .setOrigin(1, 1);
  }

  update(noise: number, sleepDepth: number, alarmSeconds: number | null): void {
    this.noise.setValue(noise);
    this.sleep.setValue(sleepDepth);
    if (alarmSeconds === null) {
      this.alarm.setText("⏰ Alarm off").setColor(Colors.success);
    } else {
      const s = Math.ceil(alarmSeconds);
      this.alarm
        .setText(`⏰ Alarm in ${s}s`)
        .setColor(s <= 15 ? Colors.danger : Colors.text);
    }
  }

  setObjectives(objectives: readonly Objective[]): void {
    this.objectives.setText(
      ["OBJECTIVES", ...objectives.map((o) => `${o.done ? "☑" : "☐"} ${o.text}`)].join("\n"),
    );
  }

  setPrompt(text: string | null): void {
    this.prompt.setText(text ?? "").setVisible(Boolean(text));
  }
}
