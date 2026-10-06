import * as Phaser from "phaser";

import { FxTextures, panelTexture, UiTextures } from "@/game/art/fxArt";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors, Fonts, Palette } from "@/game/config/theme";

export interface EndScreenOptions {
  title: string;
  titleColor: string;
  /** Overlay tint and accent: red for a loss, green for a win. */
  tint: number;
  /** "moon" for a win, "alert" for a loss. */
  icon: "moon" | "alert";
  /** First line under the title. */
  subtitle: string;
  /** Small stat chips, e.g. ["Time 21.7s", "Peak noise 28"]. */
  stats?: string[];
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
const CARD = { width: 520, height: 300 };

/** Animated end-of-level card over a dimmed, tinted backdrop. */
export function showEndScreen(scene: Phaser.Scene, options: EndScreenOptions): {
  stats: Phaser.GameObjects.Text[];
} {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  const tweens = scene.tweens;
  const accent = Phaser.Display.Color.IntegerToColor(options.tint);
  const accentCss = `rgba(${accent.red}, ${accent.green}, ${accent.blue}, 0.45)`;

  // Backdrop: dim, tint and vignette.
  const dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Palette.overlay, 0.72).setOrigin(0).setAlpha(0);
  const tint = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, options.tint, 0.12).setOrigin(0).setAlpha(0);
  const vignette = scene.add.image(0, 0, FxTextures.vignette).setOrigin(0).setAlpha(0);
  tweens.add({ targets: [dim, tint, vignette], alpha: 1, duration: 450, ease: "Quad.easeOut" });

  // Card.
  const panel = scene.add.image(0, 0, panelTexture(scene, CARD.width, CARD.height, accentCss));
  const halo = scene.add
    .image(0, -CARD.height / 2 + 6, FxTextures.glow)
    .setTint(options.tint)
    .setScale(1.6)
    .setAlpha(0.55)
    .setBlendMode(Phaser.BlendModes.ADD);
  const badge = createBadge(scene, options.icon, options.tint);
  badge.setPosition(0, -CARD.height / 2 + 6);

  const title = scene.add
    .text(0, -54, options.title, {
      fontFamily: Fonts.display,
      fontSize: "46px",
      fontStyle: "800",
      color: options.titleColor,
    })
    .setOrigin(0.5)
    .setLetterSpacing(4);
  title.setShadow(0, 4, "rgba(0,0,0,0.6)", 14, false, true);
  const subtitle = scene.add
    .text(0, -6, options.subtitle, { fontFamily: Fonts.primary, fontSize: "18px", color: Colors.text })
    .setOrigin(0.5);

  const chips: Phaser.GameObjects.GameObject[] = [];
  const statTexts = (options.stats ?? []).map((stat, i, all) => {
    const x = (i - (all.length - 1) / 2) * 170;
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 0.06);
    bg.fillRoundedRect(x - 75, 22, 150, 36, 18);
    bg.lineStyle(1, 0xffffff, 0.1);
    bg.strokeRoundedRect(x - 75, 22, 150, 36, 18);
    const text = scene.add
      .text(x, 40, stat, { fontFamily: Fonts.display, fontSize: "15px", fontStyle: "700", color: Colors.text })
      .setOrigin(0.5);
    chips.push(bg, text);
    return text;
  });

  const keyR = keyChip(scene, "R");
  const keyEnter = keyChip(scene, "Enter");
  const hintText = scene.add
    .text(0, 0, `${options.actionLabel}`, { fontFamily: Fonts.primary, fontSize: "15px", fontStyle: "600", color: Colors.text })
    .setOrigin(0, 0.5);
  const orText = scene.add
    .text(0, 0, "or click", { fontFamily: Fonts.primary, fontSize: "13px", color: Colors.mutedText })
    .setOrigin(0, 0.5);
  // Lay out: "<label>   [R]  [Enter]  or click" centred.
  const parts = [hintText, keyR, keyEnter, orText];
  const gaps = [16, 8, 10];
  const widths = parts.map((p) => ("width" in p ? (p as { width: number }).width : 0));
  const total = widths.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
  let x = -total / 2;
  parts.forEach((part, i) => {
    const w = widths[i];
    if (part instanceof Phaser.GameObjects.Container) part.setPosition(x + w / 2, 104);
    else (part as Phaser.GameObjects.Text).setPosition(x, 104);
    x += w + (gaps[i] ?? 0);
  });
  const hint = scene.add.container(0, 0, parts).setAlpha(0);

  const card = scene.add.container(cx, cy + 10, [panel, halo, badge, title, subtitle, ...chips, hint]);
  card.setAlpha(0).setScale(0.92);
  tweens.add({ targets: card, alpha: 1, scale: 1, y: cy, delay: 150, duration: 420, ease: "Back.easeOut" });

  title.setScale(options.impact ? 1.6 : 0.7).setAlpha(0);
  tweens.add({
    targets: title,
    alpha: 1,
    scale: 1,
    delay: 300,
    duration: options.impact ? 260 : 520,
    ease: options.impact ? "Quad.easeIn" : "Back.easeOut",
    onComplete: () => {
      if (options.impact) scene.cameras.main.shake(220, 0.008);
    },
  });
  badge.setScale(0);
  tweens.add({ targets: badge, scale: 1, delay: 380, duration: 420, ease: "Back.easeOut" });
  tweens.add({ targets: halo, alpha: 0.3, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  for (const [i, item] of [subtitle, ...chips].entries()) {
    const target = item as Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject;
    target.setAlpha(0);
    tweens.add({ targets: target, alpha: 1, delay: 520 + Math.floor(i / 2) * 120, duration: 320 });
  }
  tweens.chain({
    targets: hint,
    tweens: [
      { alpha: 1, delay: INPUT_DELAY_MS + 100, duration: 300 },
      { alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" },
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

  return { stats: statTexts };
}

/** Round badge with a moon (win) or an exclamation mark (loss). */
function createBadge(scene: Phaser.Scene, icon: "moon" | "alert", tint: number): Phaser.GameObjects.Container {
  const ring = scene.add.graphics();
  ring.fillStyle(0x120e22, 1);
  ring.fillCircle(0, 0, 34);
  ring.lineStyle(2, tint, 0.9);
  ring.strokeCircle(0, 0, 34);
  const glyph =
    icon === "moon"
      ? scene.add.image(0, 0, UiTextures.iconMoon).setScale(1.9).setTint(0xe8ecff)
      : scene.add
          .text(0, 2, "!", { fontFamily: Fonts.display, fontSize: "44px", fontStyle: "900", color: "#ff6b7a" })
          .setOrigin(0.5);
  return scene.add.container(0, 0, [ring, glyph]);
}

/** A small keyboard-key chip, e.g. [R]. */
function keyChip(scene: Phaser.Scene, label: string): Phaser.GameObjects.Container {
  const text = scene.add
    .text(0, 0, label, { fontFamily: Fonts.primary, fontSize: "12px", fontStyle: "700", color: "#1c1630" })
    .setOrigin(0.5);
  const width = Math.max(28, text.width + 16);
  const bg = scene.add.graphics();
  bg.fillStyle(0xa9a2c2, 1);
  bg.fillRoundedRect(-width / 2, -12, width, 26, 6);
  bg.fillStyle(0xf4f1ff, 1);
  bg.fillRoundedRect(-width / 2, -13, width, 24, 6);
  const chip = scene.add.container(0, 0, [bg, text]);
  chip.setSize(width, 26);
  return chip;
}
