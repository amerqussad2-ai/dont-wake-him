import type * as Phaser from "phaser";

import {
  circle,
  ellipse,
  fillRR,
  line,
  makeTexture,
  noShadow,
  rr,
  softShadow,
  vGradient,
  type Ctx,
} from "@/game/art/canvas";
import { LevelArtNamespace, levelTextureKey, sharedTextureKey } from "@/game/art/keys";
import { FOOT_PAD } from "@/game/art/roomArt";
import type { Rect } from "@/game/types";

// --- Player ---------------------------------------------------------------

export type PlayerFacing = "front" | "back";
export type PlayerPose = "idle" | "walk-a" | "walk-b" | "sneak-a" | "sneak-b";

export const PLAYER_FRAME = { width: 48, height: 66, footY: 62 } as const;

/** All player frames live on one sheet; frames are named "<facing>-<pose>". */
export const PLAYER_SHEET = sharedTextureKey("char", "player");

export function playerFrame(facing: PlayerFacing, pose: PlayerPose): string {
  return `${facing}-${pose}`;
}

const OUTLINE = "rgba(18, 12, 28, 0.75)";
const SKIN = "#f2c8a0";
const HAIR = "#3b2a24";

export function createPlayerTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(PLAYER_SHEET)) return;
  const poses: PlayerPose[] = ["idle", "walk-a", "walk-b", "sneak-a", "sneak-b"];
  const facings: PlayerFacing[] = ["front", "back"];
  const { width: w, height: h } = PLAYER_FRAME;
  const sheet = scene.textures.createCanvas(PLAYER_SHEET, w * poses.length, h * facings.length);
  if (!sheet) return;
  const ctx = sheet.getContext();
  facings.forEach((facing, row) => {
    poses.forEach((pose, col) => {
      ctx.save();
      ctx.translate(col * w, row * h);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      drawPlayer(ctx, facing, pose);
      ctx.restore();
      sheet.add(playerFrame(facing, pose), 0, col * w, row * h, w, h);
    });
  });
  sheet.refresh();
}

/** Shape with a thin dark outline so the silhouette reads on any floor. */
function outlined(ctx: Ctx, fill: string | CanvasGradient, path: () => void): void {
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPlayer(ctx: Ctx, facing: PlayerFacing, pose: PlayerPose): void {
  const cx = PLAYER_FRAME.width / 2;
  const foot = PLAYER_FRAME.footY;
  const sneak = pose.startsWith("sneak");
  const stride = pose.endsWith("-a") ? 1 : pose.endsWith("-b") ? -1 : 0;
  const drop = sneak ? 7 : 0;
  const back = facing === "back";

  // Legs: bent and wider apart when sneaking; alternating lift when walking.
  const hipY = 44 + drop * 0.5;
  const spread = sneak ? 8 : 5;
  for (const side of [-1, 1]) {
    const lift = stride === side ? 3 : 0;
    const lx = cx + side * spread - 3;
    outlined(ctx, "#2d3552", () => rr(ctx, lx, hipY, 7, foot - hipY - 3 - lift, 3));
    outlined(ctx, "#1d1b26", () => {
      ctx.beginPath();
      ctx.ellipse(lx + 3.5 + side * 1.5, foot - 2 - lift, 5, 3, 0, 0, Math.PI * 2);
    });
  }

  // Hoodie body.
  const top = 27 + drop;
  const bodyBottom = 48 + drop * 0.4;
  const hoodie = vGradient(ctx, top, bodyBottom, [
    [0, "#5cb8cc"],
    [1, "#3a8aa0"],
  ]);
  outlined(ctx, hoodie, () => rr(ctx, cx - 11, top, 22, bodyBottom - top, 8));
  if (!back) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(cx - 7, bodyBottom - 8, 14, 1.5);
    line(ctx, cx - 2.5, top + 2, cx - 3, top + 8, "#eaf6f8", 1.2);
    line(ctx, cx + 2.5, top + 2, cx + 3, top + 8, "#eaf6f8", 1.2);
  } else {
    // Hood lying on the back.
    outlined(ctx, "#4aa3b8", () => {
      ctx.beginPath();
      ctx.ellipse(cx, top + 4, 8, 5, 0, 0, Math.PI * 2);
    });
  }

  // Arms: swing with the stride, or tucked in (one finger to the lips) when sneaking.
  for (const side of [-1, 1]) {
    if (sneak) {
      const hx = side === -1 || back ? cx + side * 9 : cx + 1;
      const hy = side === -1 || back ? top + 12 : top - 4;
      outlined(ctx, "#4aa3b8", () => rr(ctx, cx + side * 13 - 3, top + 2, 6, 11, 3));
      outlined(ctx, SKIN, () => {
        ctx.beginPath();
        ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
      });
    } else {
      const swing = stride * side * 2.5;
      outlined(ctx, "#4aa3b8", () => rr(ctx, cx + side * 13 - 3, top + 2 + swing, 6, 15, 3));
      outlined(ctx, SKIN, () => {
        ctx.beginPath();
        ctx.arc(cx + side * 13, top + 19 + swing, 3.2, 0, Math.PI * 2);
      });
    }
  }

  // Head.
  const hy = 16 + drop;
  outlined(ctx, SKIN, () => {
    ctx.beginPath();
    ctx.arc(cx, hy, 13, 0, Math.PI * 2);
  });
  circle(ctx, cx - 13, hy + 1, 3, SKIN);
  circle(ctx, cx + 13, hy + 1, 3, SKIN);

  if (back) {
    outlined(ctx, HAIR, () => {
      ctx.beginPath();
      ctx.arc(cx, hy - 1, 13.5, 0, Math.PI * 2);
    });
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 2, hy - 2, 5, 0.5, 3.6);
    ctx.stroke();
    return;
  }

  // Hair cap with a fringe.
  outlined(ctx, HAIR, () => {
    ctx.beginPath();
    ctx.arc(cx, hy - 1, 13.5, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(cx + 9, hy - 2, cx + 4, hy - 5);
    ctx.quadraticCurveTo(cx, hy - 2, cx - 4, hy - 6);
    ctx.quadraticCurveTo(cx - 10, hy - 1, cx - 13.4, hy - 2);
    ctx.closePath();
  });
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.ellipse(cx - 4, hy - 10, 5, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Face: eyes glance sideways while sneaking.
  const look = sneak ? 1.5 : 0;
  for (const side of [-1, 1]) {
    ellipse(ctx, cx + side * 5 + look, hy + 2, 1.9, 2.6, "#1d1420");
    circle(ctx, cx + side * 5 + look + 0.7, hy + 1.2, 0.7, "#ffffff");
    ellipse(ctx, cx + side * 8, hy + 6, 2.6, 1.4, "rgba(240, 120, 120, 0.35)");
  }
  if (sneak) {
    // "Shh": a finger over the lips.
    fillRR(ctx, cx, hy + 3, 2.2, 7, 1, SKIN);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, hy + 3, 2.2, 7);
  } else {
    line(ctx, cx - 2, hy + 7, cx + 2, hy + 7, "#8a4a3a", 1.4);
  }
}

// --- Sleeper --------------------------------------------------------------

export type SleeperFace = "calm" | "stirring" | "restless" | "awake";

export function sleeperFaceKey(face: SleeperFace): string {
  return sharedTextureKey("char", `sleeper-${face}`);
}

export const BedTextures = {
  // Bed, pillow and blanket are sized from Level 1's bed rectangle.
  bed: levelTextureKey(LevelArtNamespace.level1, "bed"),
  pillow: levelTextureKey(LevelArtNamespace.level1, "bed-pillow"),
  blanket: levelTextureKey(LevelArtNamespace.level1, "bed-blanket"),
  arm: sharedTextureKey("char", "sleeper-arm"),
} as const;

/** Headboard height above the bed's footprint. */
export const HEADBOARD = 46;

export function createSleeperTextures(scene: Phaser.Scene, bed: Rect): void {
  for (const face of ["calm", "stirring", "restless", "awake"] as const) {
    makeTexture(scene, sleeperFaceKey(face), 72, 72, (ctx) => drawSleeperHead(ctx, face));
  }
  makeTexture(scene, BedTextures.bed, bed.width + FOOT_PAD * 2, bed.height + HEADBOARD + FOOT_PAD * 2, (ctx) =>
    drawBed(ctx, FOOT_PAD, FOOT_PAD + HEADBOARD, bed.width, bed.height),
  );
  makeTexture(scene, BedTextures.pillow, bed.width - 50, 58, (ctx, w, h) => drawPillow(ctx, w, h));
  makeTexture(scene, BedTextures.blanket, bed.width - 20, bed.height - 96, (ctx, w, h) => drawBlanket(ctx, w, h));
  makeTexture(scene, BedTextures.arm, 70, 30, (ctx) => drawArm(ctx));
}

function drawBed(ctx: Ctx, ox: number, oy: number, w: number, h: number): void {
  // Frame with a soft shadow, headboard rising behind the pillow.
  ctx.save();
  softShadow(ctx, 20, 10, 0.55);
  fillRR(ctx, ox, oy - HEADBOARD, w, h + HEADBOARD, 14, "#4a3122");
  ctx.restore();
  fillRR(ctx, ox, oy - HEADBOARD, w, HEADBOARD + 18, 14, vGradient(ctx, oy - HEADBOARD, oy + 18, [
    [0, "#8a5a3c"],
    [1, "#5e3c28"],
  ]));
  for (let i = 1; i < 6; i++) {
    fillRR(ctx, ox + (w * i) / 6 - 3, oy - HEADBOARD + 10, 6, HEADBOARD - 14, 3, "rgba(0, 0, 0, 0.18)");
  }
  rr(ctx, ox + 2, oy - HEADBOARD + 2, w - 4, 14, 10);
  ctx.fillStyle = "rgba(255, 230, 200, 0.12)";
  ctx.fill();

  // Mattress and fitted sheet.
  fillRR(ctx, ox + 8, oy + 6, w - 16, h - 22, 12, vGradient(ctx, oy, oy + h, [
    [0, "#d9d4e8"],
    [1, "#b7b0cc"],
  ]));
  // Footboard.
  fillRR(ctx, ox, oy + h - 20, w, 20, 8, vGradient(ctx, oy + h - 20, oy + h, [
    [0, "#7a4f35"],
    [1, "#4e3222"],
  ]));
  line(ctx, ox + 6, oy + h - 19, ox + w - 6, oy + h - 19, "rgba(255, 230, 200, 0.2)", 1.5);
}

function drawPillow(ctx: Ctx, w: number, h: number): void {
  ctx.save();
  softShadow(ctx, 8, 4, 0.35);
  fillRR(ctx, 6, 6, w - 12, h - 14, 18, vGradient(ctx, 6, h - 8, [
    [0, "#fbf8ff"],
    [1, "#d6d0e6"],
  ]));
  ctx.restore();
  // Seam and a dent where his head rests.
  rr(ctx, 12, 10, w - 24, h - 22, 14);
  ctx.strokeStyle = "rgba(120, 110, 150, 0.25)";
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  ellipse(ctx, w / 2, h / 2, w * 0.26, h * 0.26, "rgba(120, 110, 160, 0.18)");
}

function drawBlanket(ctx: Ctx, w: number, h: number): void {
  ctx.save();
  softShadow(ctx, 10, 4, 0.35);
  fillRR(ctx, 0, 0, w, h, 14, vGradient(ctx, 0, h, [
    [0, "#4a68a8"],
    [1, "#344d84"],
  ]));
  ctx.restore();
  // Quilt stitching.
  ctx.strokeStyle = "rgba(220, 230, 255, 0.16)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  for (let x = 30; x < w; x += 34) line(ctx, x, 30, x, h - 6, "rgba(220, 230, 255, 0.16)", 1.2);
  for (let y = 60; y < h; y += 34) line(ctx, 6, y, w - 6, y, "rgba(220, 230, 255, 0.16)", 1.2);
  ctx.setLineDash([]);
  // His body under the covers: a long, soft highlight.
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.beginPath();
  ctx.ellipse(w / 2 - 6, h * 0.45, w * 0.22, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  // Folded-over sheet at the top.
  fillRR(ctx, 0, 0, w, 26, 12, vGradient(ctx, 0, 26, [
    [0, "#f4f0fb"],
    [1, "#cfc8e2"],
  ]));
  line(ctx, 8, 22, w - 8, 22, "rgba(90, 80, 130, 0.25)", 1.5);
}

function drawArm(ctx: Ctx): void {
  ctx.save();
  softShadow(ctx, 5, 2, 0.35);
  fillRR(ctx, 2, 8, 54, 15, 7, vGradient(ctx, 8, 23, [
    [0, "#8d7fb6"],
    [1, "#6b5f96"],
  ]));
  ctx.restore();
  // Pyjama stripes and the hand.
  for (let x = 10; x < 52; x += 9) line(ctx, x, 9, x, 22, "rgba(255, 255, 255, 0.18)", 2);
  circle(ctx, 60, 15, 7, "#e6b48c");
  noShadow(ctx);
}

function drawSleeperHead(ctx: Ctx, face: SleeperFace): void {
  const cx = 36;
  const cy = 38;
  const skin = face === "awake" ? "#efc29b" : "#e6b48c";

  ctx.save();
  softShadow(ctx, 6, 3, 0.35);
  circle(ctx, cx, cy, 22, skin);
  ctx.restore();
  circle(ctx, cx - 21, cy + 2, 5, skin);
  circle(ctx, cx + 21, cy + 2, 5, skin);
  // Stubble.
  ctx.fillStyle = "rgba(70, 50, 40, 0.18)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 15, 9, 0, 0, Math.PI);
  ctx.fill();
  // Messy hair with grey at the temples.
  ctx.fillStyle = "#5b4636";
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 22.5, Math.PI * 1.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(cx + 12, cy - 12, cx + 6, cy - 15);
  ctx.quadraticCurveTo(cx, cy - 10, cx - 8, cy - 15);
  ctx.quadraticCurveTo(cx - 14, cy - 10, cx - 22, cy - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(200, 200, 210, 0.35)";
  ctx.fillRect(cx - 22, cy - 6, 4, 6);
  ctx.fillRect(cx + 18, cy - 6, 4, 6);

  const brow = (dx: number, tilt: number, lift: number) =>
    line(ctx, cx + dx - 5, cy - 6 - lift + tilt, cx + dx + 5, cy - 6 - lift - tilt, "#3b2a24", 2.2);
  const ink = "#2a1a16";
  ctx.lineCap = "round";

  switch (face) {
    case "calm":
      // Peaceful closed eyes, a slightly open snoring mouth.
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + side * 8, cy + 1, 4, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.stroke();
        brow(side * 8, 0, 0);
      }
      ellipse(ctx, cx, cy + 12, 3.5, 2.6, "#7a3a34");
      ellipse(ctx, cx + 6, cy + 6, 3, 1.6, "rgba(240, 120, 120, 0.3)");
      ellipse(ctx, cx - 6, cy + 6, 3, 1.6, "rgba(240, 120, 120, 0.3)");
      break;
    case "stirring":
      for (const side of [-1, 1]) {
        line(ctx, cx + side * 8 - 4, cy + 2, cx + side * 8 + 4, cy + 2, ink, 2);
        brow(side * 8, side * 1.5, 1);
      }
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + 12);
      ctx.quadraticCurveTo(cx, cy + 10, cx + 5, cy + 12);
      ctx.strokeStyle = "#7a3a34";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case "restless":
      // Squeezed eyes, furrowed brow, wavy grimace and a bead of sweat.
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + side * 12, cy - 1);
        ctx.lineTo(cx + side * 6, cy + 2);
        ctx.lineTo(cx + side * 12, cy + 5);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.stroke();
        brow(side * 8, side * 3, 2);
      }
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 13);
      for (let i = 1; i <= 4; i++) ctx.lineTo(cx - 6 + i * 3, cy + 13 + (i % 2 ? -2 : 0));
      ctx.strokeStyle = "#7a3a34";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#9fd0ff";
      ctx.beginPath();
      ctx.moveTo(cx + 17, cy - 12);
      ctx.quadraticCurveTo(cx + 22, cy - 4, cx + 17, cy - 3);
      ctx.quadraticCurveTo(cx + 12, cy - 4, cx + 17, cy - 12);
      ctx.fill();
      break;
    case "awake":
      // Wide open, startled.
      for (const side of [-1, 1]) {
        ellipse(ctx, cx + side * 8, cy + 1, 5.5, 6.5, "#ffffff");
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        circle(ctx, cx + side * 8, cy + 2, 2.6, ink);
        brow(side * 8, -side * 1.5, 6);
      }
      ellipse(ctx, cx, cy + 14, 4.5, 5, "#5a2420");
      break;
  }
}
