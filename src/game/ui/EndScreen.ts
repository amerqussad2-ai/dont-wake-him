import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors, Fonts, Palette } from "@/game/config/theme";

export interface EndScreenOptions {
  title: string;
  titleColor: string;
  lines: string[];
  actionLabel: string;
  onAction: () => void;
}

/** Dimmed overlay with a title, a few lines of text and a restart action. */
export function showEndScreen(scene: Phaser.Scene, options: EndScreenOptions): void {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;

  scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Palette.overlay, 0.75).setOrigin(0);
  scene.add
    .text(cx, cy - 90, options.title, {
      fontFamily: Fonts.primary,
      fontSize: "56px",
      fontStyle: "bold",
      color: options.titleColor,
    })
    .setOrigin(0.5);
  scene.add
    .text(cx, cy, options.lines.join("\n"), {
      fontFamily: Fonts.primary,
      fontSize: "20px",
      color: Colors.text,
      align: "center",
      lineSpacing: 8,
    })
    .setOrigin(0.5);
  scene.add
    .text(cx, cy + 100, `${options.actionLabel}  —  press R / Enter or click`, {
      fontFamily: Fonts.primary,
      fontSize: "18px",
      color: Colors.mutedText,
    })
    .setOrigin(0.5);

  let done = false;
  const act = () => {
    if (done) return;
    done = true;
    options.onAction();
  };
  scene.input.keyboard?.once("keydown-R", act);
  scene.input.keyboard?.once("keydown-ENTER", act);
  scene.input.once("pointerdown", act);
}
