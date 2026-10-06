import type * as Phaser from "phaser";

import {
  circle,
  fillRR,
  hGradient,
  line,
  makeTexture,
  radial,
  rr,
  softShadow,
  vGradient,
  type Ctx,
} from "@/game/art/canvas";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";

export const FxTextures = {
  glow: "fx-glow",
  dot: "fx-dot",
  ring: "fx-ring",
  spark: "fx-spark",
  shadow: "fx-shadow",
  vignette: "fx-vignette",
  danger: "fx-danger",
} as const;

export const UiTextures = {
  keycap: "ui-keycap",
  barTrack: "ui-bar-track",
  barNoise: "ui-bar-noise",
  barSleep: "ui-bar-sleep",
  iconNoise: "ui-icon-noise",
  iconMoon: "ui-icon-moon",
  iconClock: "ui-icon-clock",
  iconLock: "ui-icon-lock",
  checkEmpty: "ui-check-empty",
  checkDone: "ui-check-done",
} as const;

export const BAR = { width: 264, height: 10 } as const;

export function createFxTextures(scene: Phaser.Scene): void {
  makeTexture(scene, FxTextures.glow, 128, 128, (ctx) => {
    ctx.fillStyle = radial(ctx, 64, 64, 64, [
      [0, "rgba(255,255,255,1)"],
      [0.25, "rgba(255,255,255,0.55)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    ctx.fillRect(0, 0, 128, 128);
  });
  makeTexture(scene, FxTextures.dot, 16, 16, (ctx) => {
    ctx.fillStyle = radial(ctx, 8, 8, 8, [
      [0, "rgba(255,255,255,1)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    ctx.fillRect(0, 0, 16, 16);
  });
  makeTexture(scene, FxTextures.ring, 128, 128, (ctx) => {
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 4;
    ctx.stroke();
  });
  makeTexture(scene, FxTextures.spark, 32, 32, (ctx) => {
    ctx.fillStyle = radial(ctx, 16, 16, 16, [
      [0, "rgba(255,255,255,0.8)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 2.5 : 14;
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
    }
    ctx.fill();
  });
  makeTexture(scene, FxTextures.shadow, 64, 24, (ctx) => {
    ctx.save();
    ctx.scale(1, 24 / 64);
    ctx.fillStyle = radial(ctx, 32, 32, 32, [
      [0, "rgba(0,0,0,0.6)"],
      [0.6, "rgba(0,0,0,0.3)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillRect(0, 0, 64, 64);
    ctx.restore();
  });
  makeTexture(scene, FxTextures.vignette, GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    ctx.save();
    ctx.scale(1, GAME_HEIGHT / GAME_WIDTH);
    ctx.fillStyle = radial(ctx, GAME_WIDTH / 2, GAME_WIDTH / 2, GAME_WIDTH * 0.62, [
      [0.45, "rgba(6, 4, 14, 0)"],
      [1, "rgba(6, 4, 14, 0.85)"],
    ]);
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_WIDTH);
    ctx.restore();
  });
  makeTexture(scene, FxTextures.danger, GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    ctx.save();
    ctx.scale(1, GAME_HEIGHT / GAME_WIDTH);
    ctx.fillStyle = radial(ctx, GAME_WIDTH / 2, GAME_WIDTH / 2, GAME_WIDTH * 0.6, [
      [0.62, "rgba(255, 40, 60, 0)"],
      [0.88, "rgba(220, 30, 50, 0.32)"],
      [1, "rgba(160, 10, 30, 0.7)"],
    ]);
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_WIDTH);
    ctx.restore();
  });

  createUiTextures(scene);
}

/** Frosted dark panel used by the HUD and end screens. Cached per size. */
export function panelTexture(scene: Phaser.Scene, width: number, height: number, accent = "rgba(255,255,255,0.10)"): string {
  const key = `ui-panel-${width}x${height}-${accent}`;
  const pad = 16;
  makeTexture(scene, key, width + pad * 2, height + pad * 2, (ctx) => {
    ctx.save();
    softShadow(ctx, 18, 8, 0.5);
    fillRR(ctx, pad, pad, width, height, 16, vGradient(ctx, pad, pad + height, [
      [0, "rgba(34, 28, 56, 0.86)"],
      [1, "rgba(16, 13, 30, 0.9)"],
    ]));
    ctx.restore();
    rr(ctx, pad + 0.5, pad + 0.5, width - 1, height - 1, 16);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Soft top sheen.
    rr(ctx, pad + 1, pad + 1, width - 2, Math.min(28, height / 2), 15);
    ctx.fillStyle = vGradient(ctx, pad, pad + 28, [
      [0, "rgba(255,255,255,0.07)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    ctx.fill();
  });
  return key;
}

function createUiTextures(scene: Phaser.Scene): void {
  const { width: w, height: h } = BAR;
  makeTexture(scene, UiTextures.barTrack, w, h, (ctx) => {
    fillRR(ctx, 0, 0, w, h, h / 2, "rgba(0, 0, 0, 0.45)");
    rr(ctx, 0.5, 0.5, w - 1, h - 1, h / 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();
    for (let x = w / 10; x < w; x += w / 10) line(ctx, x, 3, x, h - 3, "rgba(255,255,255,0.05)");
  });
  const bar = (key: string, stops: [number, string][]) =>
    makeTexture(scene, key, w, h, (ctx) => {
      fillRR(ctx, 0, 0, w, h, h / 2, hGradient(ctx, 0, w, stops));
      rr(ctx, 1, 1, w - 2, h / 2 - 1, h / 4);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fill();
    });
  bar(UiTextures.barNoise, [
    [0, "#4fe0a0"],
    [0.5, "#f5c451"],
    [0.8, "#ff7a45"],
    [1, "#ff3d5a"],
  ]);
  bar(UiTextures.barSleep, [
    [0, "#4b4fb8"],
    [1, "#a6b4ff"],
  ]);

  makeTexture(scene, UiTextures.keycap, 30, 32, (ctx) => {
    fillRR(ctx, 1, 4, 28, 27, 7, "#a9a2c2");
    fillRR(ctx, 1, 1, 28, 26, 7, vGradient(ctx, 1, 27, [
      [0, "#ffffff"],
      [1, "#dcd6ee"],
    ]));
    ctx.fillStyle = "#1c1630";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("E", 15, 15);
  });

  icon(scene, UiTextures.iconNoise, (ctx) => {
    fillRR(ctx, 3, 9, 5, 6, 1, "#ffffff");
    ctx.beginPath();
    ctx.moveTo(8, 9);
    ctx.lineTo(13, 5);
    ctx.lineTo(13, 19);
    ctx.lineTo(8, 15);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    for (const r of [4, 7.5]) {
      ctx.beginPath();
      ctx.arc(13, 12, r + 2, -0.8, 0.8);
      ctx.stroke();
    }
  });
  icon(scene, UiTextures.iconMoon, (ctx) => {
    circle(ctx, 12, 12, 8, "#ffffff");
    ctx.globalCompositeOperation = "destination-out";
    circle(ctx, 16, 9, 7, "#000");
    ctx.globalCompositeOperation = "source-over";
    circle(ctx, 18, 16, 1.2, "#ffffff");
    circle(ctx, 20, 6, 0.9, "#ffffff");
  });
  icon(scene, UiTextures.iconClock, (ctx) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, 13, 8, 0, Math.PI * 2);
    ctx.stroke();
    line(ctx, 12, 13, 12, 8, "#ffffff", 2);
    line(ctx, 12, 13, 15, 15, "#ffffff", 2);
    line(ctx, 5, 5, 8, 3, "#ffffff", 2);
    line(ctx, 19, 5, 16, 3, "#ffffff", 2);
  });
  icon(scene, UiTextures.iconLock, (ctx) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(12, 10, 4.5, Math.PI, 0);
    ctx.lineTo(16.5, 12);
    ctx.moveTo(7.5, 12);
    ctx.lineTo(7.5, 10);
    ctx.stroke();
    fillRR(ctx, 5, 11, 14, 10, 2, "#ffffff");
  });
  icon(scene, UiTextures.checkEmpty, (ctx) => {
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(12, 12, 7.5, 0, Math.PI * 2);
    ctx.stroke();
  });
  icon(scene, UiTextures.checkDone, (ctx) => {
    circle(ctx, 12, 12, 8.5, "#4fe0a0");
    ctx.strokeStyle = "#0f2a1e";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(8, 12.5);
    ctx.lineTo(11, 15.5);
    ctx.lineTo(16.5, 9);
    ctx.stroke();
  });
}

function icon(scene: Phaser.Scene, key: string, draw: (ctx: Ctx) => void): void {
  makeTexture(scene, key, 24, 24, draw);
}
