import * as Phaser from "phaser";

import { FxTextures } from "@/game/art/fxArt";
import { Depth } from "@/game/art/layers";
import { Fonts } from "@/game/config/theme";

/** Linear blend between two 0xRRGGBB colours. */
export function lerpColor(from: number, to: number, t: number): number {
  const k = Phaser.Math.Clamp(t, 0, 1);
  const r = Math.round(((from >> 16) & 0xff) + (((to >> 16) & 0xff) - ((from >> 16) & 0xff)) * k);
  const g = Math.round(((from >> 8) & 0xff) + (((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * k);
  const b = Math.round((from & 0xff) + ((to & 0xff) - (from & 0xff)) * k);
  return (r << 16) | (g << 8) | b;
}

/** Frame-rate independent smoothing factor for exponential easing. */
export function smoothing(rate: number, deltaSeconds: number): number {
  return 1 - Math.exp(-rate * deltaSeconds);
}

/** An expanding, glowing ring: the visual language for "sound". */
export function noiseRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
  duration = 600,
  alpha = 0.9,
): void {
  const ring = scene.add
    .image(x, y, FxTextures.ring)
    .setTint(color)
    .setAlpha(alpha)
    .setScale(0.12)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(Depth.fx);
  scene.tweens.add({
    targets: ring,
    scale: radius / 52,
    alpha: 0,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy(),
  });
}

/** Text that pops, rises and fades out. */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string,
  size = 18,
): void {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: Fonts.display,
      fontSize: `${size}px`,
      fontStyle: "800",
      color,
      stroke: "#120c1e",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setScale(0.5)
    .setDepth(Depth.fx);
  label.setShadow(0, 3, "rgba(0,0,0,0.5)", 6, true, true);
  scene.tweens.add({ targets: label, scale: 1, duration: 180, ease: "Back.easeOut" });
  scene.tweens.add({
    targets: label,
    y: y - 46,
    alpha: 0,
    delay: 300,
    duration: 900,
    ease: "Quad.easeIn",
    onComplete: () => label.destroy(),
  });
}

/** Glowing sparks flying outward from a point. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count = 10,
  distance = 46,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = distance * (0.7 + Math.random() * 0.5);
    const star = i % 3 === 0;
    const spark = scene.add
      .image(x, y, star ? FxTextures.spark : FxTextures.dot)
      .setTint(color)
      .setScale(star ? 0.55 : 0.6 + Math.random() * 0.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Depth.fx);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      scale: 0.1,
      angle: star ? 180 : 0,
      alpha: 0,
      duration: 550 + Math.random() * 250,
      ease: "Cubic.easeOut",
      onComplete: () => spark.destroy(),
    });
  }
}

/** A small dust puff at the player's feet. */
export function dustPuff(scene: Phaser.Scene, x: number, y: number, alpha = 0.35): void {
  for (let i = 0; i < 3; i++) {
    const puff = scene.add
      .image(x + Phaser.Math.Between(-6, 6), y, FxTextures.dot)
      .setTint(0xd8c8b8)
      .setAlpha(alpha)
      .setScale(0.6)
      .setDepth(Depth.floorFx);
    scene.tweens.add({
      targets: puff,
      y: y - 6,
      x: puff.x + Phaser.Math.Between(-8, 8),
      scale: 1.3,
      alpha: 0,
      duration: 420,
      ease: "Quad.easeOut",
      onComplete: () => puff.destroy(),
    });
  }
}
