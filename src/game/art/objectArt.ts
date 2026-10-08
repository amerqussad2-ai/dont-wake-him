import type * as Phaser from "phaser";

import {
  circle,
  ellipse,
  fillRR,
  line,
  makeTexture,
  rr,
  softShadow,
  vGradient,
  type Ctx,
} from "@/game/art/canvas";
import { LevelArtNamespace, levelTextureKey, sharedTextureKey } from "@/game/art/keys";
import { footprintTexture, FurnitureHeight } from "@/game/art/roomArt";
import type { LevelDefinition } from "@/game/types";

export const ObjectTextures = {
  key: sharedTextureKey("obj", "key"),
  clockOn: sharedTextureKey("obj", "clock-on"),
  clockOff: sharedTextureKey("obj", "clock-off"),
  // Sized from Level 1's drawer area, so it belongs to the level.
  dresser: levelTextureKey(LevelArtNamespace.level1, "dresser"),
  drawer: sharedTextureKey("obj", "drawer"),
  wallet: sharedTextureKey("obj", "wallet"),
} as const;

/** Drawer box: interior (top) + front panel (bottom). */
export const DRAWER = { width: 52, interior: 26, front: 28 } as const;

export function createObjectTextures(scene: Phaser.Scene, level: LevelDefinition): void {
  makeTexture(scene, ObjectTextures.key, 40, 22, (ctx) => drawKey(ctx));
  makeTexture(scene, ObjectTextures.clockOn, 52, 54, (ctx) => drawClock(ctx, true));
  makeTexture(scene, ObjectTextures.clockOff, 52, 54, (ctx) => drawClock(ctx, false));
  makeTexture(scene, ObjectTextures.wallet, 30, 22, (ctx) => drawWallet(ctx, 2, 2));
  makeTexture(scene, ObjectTextures.drawer, DRAWER.width, DRAWER.interior + DRAWER.front, (ctx) => drawDrawer(ctx));

  const dresser = level.interactables.find((i) => i.effect === "open");
  if (dresser) {
    const { width, height } = dresser.area;
    footprintTexture(scene, ObjectTextures.dresser, width, height, FurnitureHeight.dresser, (ctx, ox, oy) =>
      drawDresser(ctx, ox, oy, width, height, FurnitureHeight.dresser),
    );
  }
}

function drawKey(ctx: Ctx): void {
  ctx.save();
  softShadow(ctx, 4, 2, 0.6);
  const brass = vGradient(ctx, 4, 18, [
    [0, "#ffe39a"],
    [1, "#c9922e"],
  ]);
  // Bow (ring), shaft and teeth.
  ctx.beginPath();
  ctx.arc(10, 11, 7, 0, Math.PI * 2);
  ctx.arc(10, 11, 3.2, 0, Math.PI * 2, true);
  ctx.fillStyle = brass;
  ctx.fill("evenodd");
  fillRR(ctx, 15, 9, 21, 4.5, 2, brass);
  ctx.fillRect(28, 12, 3, 5);
  ctx.fillRect(33, 12, 3, 4);
  ctx.restore();
  line(ctx, 17, 10, 33, 10, "rgba(255, 255, 255, 0.6)", 1);
  circle(ctx, 8, 8, 1.5, "rgba(255, 255, 255, 0.8)");
}

function drawClock(ctx: Ctx, on: boolean): void {
  const cx = 26;
  const cy = 30;
  const body = on ? ["#ff6b5e", "#c23a34"] : ["#c98a84", "#8e5a56"];
  // Legs and bells.
  line(ctx, cx - 10, cy + 14, cx - 14, cy + 21, "#3a2a2a", 3);
  line(ctx, cx + 10, cy + 14, cx + 14, cy + 21, "#3a2a2a", 3);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * 12, cy - 15, 7, Math.PI, 0);
    ctx.fillStyle = "#e7c46a";
    ctx.fill();
  }
  line(ctx, cx, cy - 18, cx, cy - 24, "#3a2a2a", 2);
  circle(ctx, cx, cy - 24, 2.5, "#e7c46a");
  // Body and face.
  ctx.save();
  softShadow(ctx, 6, 3, 0.55);
  circle(ctx, cx, cy, 16, vGradient(ctx, cy - 16, cy + 16, [
    [0, body[0]],
    [1, body[1]],
  ]));
  ctx.restore();
  circle(ctx, cx, cy, 12, on ? "#fff6e8" : "#e6ddd2");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    circle(ctx, cx + Math.cos(a) * 9.5, cy + Math.sin(a) * 9.5, i % 3 ? 0.6 : 1.1, "#3a2a2a");
  }
  // Hands: nearly time to ring / stopped.
  const hour = on ? -2.2 : -1.2;
  const minute = on ? -1.65 : 0.4;
  line(ctx, cx, cy, cx + Math.cos(hour) * 6, cy + Math.sin(hour) * 6, "#2a1a16", 2);
  line(ctx, cx, cy, cx + Math.cos(minute) * 9, cy + Math.sin(minute) * 9, "#2a1a16", 1.5);
  line(ctx, cx, cy, cx + Math.cos(-1.9) * 9, cy + Math.sin(-1.9) * 9, on ? "#e53935" : "#7a7a7a", 1);
  circle(ctx, cx, cy, 1.5, "#2a1a16");
  // Gloss and a status light.
  ellipse(ctx, cx - 6, cy - 9, 5, 2.5, "rgba(255, 255, 255, 0.35)");
  circle(ctx, cx + 13, cy + 10, 2.5, on ? "#ffdf5e" : "#6ee7a0");
}

function drawWallet(ctx: Ctx, x: number, y: number): void {
  ctx.save();
  softShadow(ctx, 3, 2, 0.5);
  fillRR(ctx, x, y, 26, 18, 3, vGradient(ctx, y, y + 18, [
    [0, "#8a5a36"],
    [1, "#5e3a22"],
  ]));
  ctx.restore();
  rr(ctx, x + 2, y + 2, 22, 14, 2);
  ctx.strokeStyle = "rgba(255, 220, 170, 0.35)";
  ctx.setLineDash([2, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  fillRR(ctx, x + 16, y + 6, 10, 6, 2, "#3e2616");
}

function drawDrawer(ctx: Ctx): void {
  const { width: w, interior, front } = DRAWER;
  // Interior seen from above (the wallet is a separate sprite).
  fillRR(ctx, 2, 0, w - 4, interior + 6, 4, vGradient(ctx, 0, interior, [
    [0, "#3a2418"],
    [1, "#5a3a26"],
  ]));
  rr(ctx, 2, 0, w - 4, interior + 6, 4);
  ctx.strokeStyle = "#8a5f3f";
  ctx.lineWidth = 3;
  ctx.stroke();
  // Front panel.
  fillRR(ctx, 0, interior, w, front, 5, vGradient(ctx, interior, interior + front, [
    [0, "#8f6141"],
    [1, "#6a452d"],
  ]));
  fillRR(ctx, w / 2 - 9, interior + front / 2 - 2, 18, 4, 2, "#e3c27a");
}

function drawDresser(ctx: Ctx, ox: number, oy: number, w: number, h: number, H: number): void {
  ctx.save();
  softShadow(ctx, 18, 9, 0.55);
  fillRR(ctx, ox, oy, w, h + H, 8, "#4a3020");
  ctx.restore();
  // Front face with three drawers; the middle one has a keyhole.
  fillRR(ctx, ox, oy + h - 4, w, H + 4, 8, vGradient(ctx, oy + h, oy + h + H, [
    [0, "#7a5236"],
    [1, "#553621"],
  ]));
  const dw = (w - 24) / 3;
  for (let i = 0; i < 3; i++) {
    const dx = ox + 6 + i * (dw + 6);
    rr(ctx, dx, oy + h + 4, dw, H - 10, 4);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    fillRR(ctx, dx + dw / 2 - 9, oy + h + H / 2 - 4, 18, 4, 2, "#e3c27a");
  }
  const kx = ox + w / 2;
  circle(ctx, kx, oy + h + H / 2 + 6, 2.4, "#2a1a10");
  ctx.fillStyle = "#2a1a10";
  ctx.fillRect(kx - 1, oy + h + H / 2 + 6, 2, 4);
  // Top surface: wood with a runner, a jewellery dish, a bottle and a frame.
  fillRR(ctx, ox, oy, w, h, 8, vGradient(ctx, oy, oy + h, [
    [0, "#a2714c"],
    [1, "#83583a"],
  ]));
  rr(ctx, ox + 1, oy + 1, w - 2, h - 2, 8);
  ctx.strokeStyle = "rgba(255, 240, 220, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  fillRR(ctx, ox + 20, oy + 18, w - 40, h - 36, 4, "rgba(230, 220, 200, 0.18)");
  ctx.save();
  softShadow(ctx, 5, 3, 0.45);
  fillRR(ctx, ox + 18, oy + 8, 30, 38, 3, "#d8c9a8");
  ctx.restore();
  ctx.fillStyle = vGradient(ctx, oy + 12, oy + 42, [
    [0, "#7aa3c9"],
    [1, "#c9a27a"],
  ]);
  ctx.fillRect(ox + 21, oy + 11, 24, 32);
  ctx.save();
  softShadow(ctx, 4, 2, 0.45);
  ellipse(ctx, ox + w - 40, oy + 38, 13, 8, "#cfd6e6");
  ctx.restore();
  circle(ctx, ox + w - 43, oy + 37, 2, "#e8c66a");
  circle(ctx, ox + w - 37, oy + 39, 2, "#9fd0ff");
  ctx.save();
  softShadow(ctx, 4, 2, 0.45);
  fillRR(ctx, ox + w - 72, oy + 18, 12, 22, 4, "rgba(190, 150, 220, 0.85)");
  ctx.restore();
  fillRR(ctx, ox + w - 69, oy + 13, 6, 6, 2, "#e3c27a");
}
