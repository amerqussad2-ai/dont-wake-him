import * as Phaser from "phaser";

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

/** An expanding, fading ring: the visual language for "sound". */
export function noiseRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
  duration = 600,
  alpha = 0.9,
): void {
  const ring = scene.add.circle(x, y, 8).setStrokeStyle(2, color, alpha);
  scene.tweens.add({
    targets: ring,
    scale: radius / 8,
    alpha: 0,
    duration,
    ease: "Quad.easeOut",
    onComplete: () => ring.destroy(),
  });
}

/** Text that rises and fades out. */
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
      fontFamily: Fonts.primary,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#000000",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setScale(0.6);
  scene.tweens.add({ targets: label, scale: 1, duration: 160, ease: "Back.easeOut" });
  scene.tweens.add({
    targets: label,
    y: y - 46,
    alpha: 0,
    delay: 250,
    duration: 900,
    ease: "Quad.easeIn",
    onComplete: () => label.destroy(),
  });
}

/** Small dots flying outward from a point. */
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
    const dot = scene.add.circle(x, y, 3 + Math.random() * 2, color);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      scale: 0.2,
      alpha: 0,
      duration: 500 + Math.random() * 200,
      ease: "Cubic.easeOut",
      onComplete: () => dot.destroy(),
    });
  }
}
