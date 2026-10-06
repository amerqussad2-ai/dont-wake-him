import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors, Fonts, Palette } from "@/game/config/theme";

export interface EndScreenOptions {
  title: string;
  titleColor: string;
  /** Overlay tint: red for a loss, dark for a win. */
  tint: number;
  lines: string[];
  actionLabel: string;
  /** Shake the title as it lands (used for Game Over). */
  impact?: boolean;
  /** Called the moment the player confirms (e.g. a click sound). */
  onConfirm?: () => void;
  /** Called once the fade-out finishes. */
  onAction: () => void;
}

/** Ignore input briefly so a held key does not skip the screen instantly. */
const INPUT_DELAY_MS = 700;

/** Animated overlay with a title, a few lines and a restart action. */
export function showEndScreen(scene: Phaser.Scene, options: EndScreenOptions): {
  lines: Phaser.GameObjects.Text[];
} {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  const tweens = scene.tweens;

  const overlay = scene.add
    .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Palette.overlay, 0.78)
    .setOrigin(0)
    .setAlpha(0);
  const tint = scene.add
    .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, options.tint, 0.18)
    .setOrigin(0)
    .setAlpha(0);
  tweens.add({ targets: [overlay, tint], alpha: 1, duration: 450, ease: "Quad.easeOut" });

  const title = scene.add
    .text(cx, cy - 90, options.title, {
      fontFamily: Fonts.primary,
      fontSize: "60px",
      fontStyle: "bold",
      color: options.titleColor,
      stroke: "#000000",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setAlpha(0)
    .setScale(options.impact ? 1.8 : 0.6);
  tweens.add({
    targets: title,
    alpha: 1,
    scale: 1,
    delay: 200,
    duration: options.impact ? 260 : 520,
    ease: options.impact ? "Quad.easeIn" : "Back.easeOut",
    onComplete: () => {
      if (options.impact) scene.cameras.main.shake(220, 0.008);
    },
  });

  const lines = options.lines.map((line, i) => {
    const text = scene.add
      .text(cx, cy - 4 + i * 32, line, {
        fontFamily: Fonts.primary,
        fontSize: "20px",
        color: Colors.text,
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0);
    tweens.add({
      targets: text,
      alpha: 1,
      y: text.y - 8,
      delay: 500 + i * 140,
      duration: 350,
      ease: "Quad.easeOut",
    });
    return text;
  });

  const hint = scene.add
    .text(cx, cy + 110, `${options.actionLabel}  —  press R / Enter or click`, {
      fontFamily: Fonts.primary,
      fontSize: "18px",
      color: Colors.mutedText,
    })
    .setOrigin(0.5)
    .setAlpha(0);
  tweens.chain({
    targets: hint,
    tweens: [
      { alpha: 1, delay: INPUT_DELAY_MS + 100, duration: 300 },
      { alpha: 0.45, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" },
    ],
  });

  let done = false;
  const act = () => {
    if (done) return;
    done = true;
    options.onConfirm?.();
    scene.cameras.main.fadeOut(250, 0, 0, 0);
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, options.onAction);
  };
  scene.time.delayedCall(INPUT_DELAY_MS, () => {
    scene.input.keyboard?.once("keydown-R", act);
    scene.input.keyboard?.once("keydown-ENTER", act);
    scene.input.once("pointerdown", act);
  });

  return { lines };
}
