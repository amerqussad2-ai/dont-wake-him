import type * as Phaser from "phaser";

import {
  circle,
  ellipse,
  fillRR,
  hGradient,
  line,
  makeTexture,
  noShadow,
  radial,
  rr,
  seeded,
  softShadow,
  vGradient,
  type Ctx,
} from "@/game/art/canvas";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import type { FurnitureArt, LevelDefinition } from "@/game/types";

export const RoomTextures = {
  background: "room-bg",
  lightmap: "room-lightmap",
} as const;

/** Space around footprint textures so baked shadows are not clipped. */
export const FOOT_PAD = 18;

/** How tall each piece of furniture looks (its front face), in pixels. */
export const FurnitureHeight: Record<FurnitureArt | "dresser" | "bed", number> = {
  nightstand: 26,
  armchair: 34,
  toyChest: 26,
  dresser: 40,
  bed: 18,
};

/** Window and door positions on the walls (shared by art and lighting). */
export const RoomFeatures = {
  wallBottom: 98,
  window: { x: 562, y: 14, width: 156, height: 76 },
  lamp: { x: 444, y: 128 },
  door: { y: 556, height: 90 },
} as const;

// --- Room background ------------------------------------------------------

export function createRoomTextures(scene: Phaser.Scene, level: LevelDefinition): void {
  makeTexture(scene, RoomTextures.background, GAME_WIDTH, GAME_HEIGHT, (ctx) => drawRoom(ctx, level));
  makeTexture(scene, RoomTextures.lightmap, GAME_WIDTH, GAME_HEIGHT, (ctx) => drawLightmap(ctx, level));
}

function drawRoom(ctx: Ctx, level: LevelDefinition): void {
  const { room } = level;
  const right = room.x + room.width;
  const bottom = room.y + room.height;

  // Wall tops (seen from above) everywhere, floor and wall face on top.
  ctx.fillStyle = "#17131f";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawWallFace(ctx, room.x, right);
  drawFloor(ctx, room.x, room.y, room.width, room.height);
  drawRug(ctx, 760, 560, 300, 180);
  drawSideWalls(ctx, room.x, right, room.y, bottom);
  drawDoor(ctx, right);
  drawWindow(ctx);
  drawWallDecor(ctx);
  drawFloorProps(ctx);
}

function drawWallFace(ctx: Ctx, left: number, right: number): void {
  const bottom = RoomFeatures.wallBottom;
  ctx.fillStyle = vGradient(ctx, 0, bottom, [
    [0, "#2a2340"],
    [1, "#3b3254"],
  ]);
  ctx.fillRect(left - 12, 0, right - left + 24, bottom);

  // Wallpaper: soft vertical stripes and a small diamond motif.
  for (let x = left; x < right; x += 22) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
    ctx.fillRect(x, 0, 9, bottom);
  }
  ctx.fillStyle = "rgba(255, 230, 200, 0.05)";
  for (let y = 14; y < bottom - 10; y += 26) {
    for (let x = left + 15 + ((y / 26) % 2) * 11; x < right; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x + 3, y);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x - 3, y);
      ctx.fill();
    }
  }

  // Crown line and baseboard.
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(left - 12, 0, right - left + 24, 4);
  ctx.fillStyle = vGradient(ctx, bottom, bottom + 12, [
    [0, "#4a3f5e"],
    [1, "#2e2740"],
  ]);
  ctx.fillRect(left - 12, bottom, right - left + 24, 12);
  line(ctx, left - 12, bottom + 0.5, right + 12, bottom + 0.5, "rgba(255,255,255,0.12)");
}

function drawFloor(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const rand = seeded(7);
  const plankH = 26;
  const tones = ["#6e4b35", "#684530", "#74513a", "#62412e", "#6b4833"];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  for (let py = y; py < y + h; py += plankH) {
    let px = x - rand() * 200;
    while (px < x + w) {
      const len = 140 + rand() * 180;
      ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
      ctx.fillRect(px, py, len, plankH);
      // Grain.
      ctx.strokeStyle = "rgba(40, 20, 10, 0.12)";
      ctx.lineWidth = 1;
      for (let g = 0; g < 3; g++) {
        const gy = py + 5 + rand() * (plankH - 10);
        ctx.beginPath();
        ctx.moveTo(px + 6, gy);
        ctx.bezierCurveTo(px + len * 0.3, gy + 2, px + len * 0.6, gy - 2, px + len - 6, gy + 1);
        ctx.stroke();
      }
      // Seam and top highlight.
      ctx.fillStyle = "rgba(20, 10, 5, 0.45)";
      ctx.fillRect(px + len - 1, py, 2, plankH);
      ctx.fillStyle = "rgba(255, 230, 200, 0.05)";
      ctx.fillRect(px, py + 1, len, 1);
      px += len;
    }
    ctx.fillStyle = "rgba(20, 10, 5, 0.5)";
    ctx.fillRect(x, py + plankH - 1, w, 1.5);
  }

  // Ambient occlusion along the walls.
  const ao = 34;
  ctx.fillStyle = vGradient(ctx, y, y + ao, [
    [0, "rgba(10, 6, 20, 0.6)"],
    [1, "rgba(10, 6, 20, 0)"],
  ]);
  ctx.fillRect(x, y, w, ao);
  ctx.fillStyle = vGradient(ctx, y + h - ao, y + h, [
    [0, "rgba(10, 6, 20, 0)"],
    [1, "rgba(10, 6, 20, 0.5)"],
  ]);
  ctx.fillRect(x, y + h - ao, w, ao);
  ctx.fillStyle = hGradient(ctx, x, x + ao, [
    [0, "rgba(10, 6, 20, 0.5)"],
    [1, "rgba(10, 6, 20, 0)"],
  ]);
  ctx.fillRect(x, y, ao, h);
  ctx.fillStyle = hGradient(ctx, x + w - ao, x + w, [
    [0, "rgba(10, 6, 20, 0)"],
    [1, "rgba(10, 6, 20, 0.5)"],
  ]);
  ctx.fillRect(x + w - ao, y, ao, h);
  ctx.restore();
}

function drawSideWalls(ctx: Ctx, left: number, right: number, top: number, bottom: number): void {
  const cap = "#1d1828";
  ctx.fillStyle = cap;
  ctx.fillRect(0, top - 12, left, GAME_HEIGHT);
  ctx.fillRect(right, top - 12, GAME_WIDTH - right, GAME_HEIGHT);
  ctx.fillRect(0, bottom, GAME_WIDTH, GAME_HEIGHT - bottom);
  // Inner edges catch a little light.
  ctx.fillStyle = "#3a3150";
  ctx.fillRect(left - 5, top - 12, 5, bottom - top + 17);
  ctx.fillRect(right, top - 12, 5, bottom - top + 17);
  ctx.fillRect(left - 5, bottom, right - left + 10, 5);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, bottom + 5, GAME_WIDTH, 2);
}

function drawDoor(ctx: Ctx, right: number): void {
  const { y, height } = RoomFeatures.door;
  // Doorway into a warm hallway.
  ctx.fillStyle = hGradient(ctx, right, right + 60, [
    [0, "#3b2a22"],
    [1, "#1a120e"],
  ]);
  ctx.fillRect(right, y, 60, height);
  // Door leaf, nearly closed.
  ctx.save();
  softShadow(ctx, 8, 3, 0.5);
  fillRR(ctx, right + 2, y + 2, 14, height - 4, 3, hGradient(ctx, right + 2, right + 16, [
    [0, "#9a6a45"],
    [1, "#6e4a30"],
  ]));
  ctx.restore();
  circle(ctx, right + 4, y + height / 2, 3, "#e3c27a");
  // Frame.
  ctx.fillStyle = "#4a3a2c";
  ctx.fillRect(right - 4, y - 6, 66, 6);
  ctx.fillRect(right - 4, y + height, 66, 6);
}

function drawWindow(ctx: Ctx): void {
  const { x, y, width: w, height: h } = RoomFeatures.window;

  // Night sky with stars and a crescent moon.
  ctx.fillStyle = vGradient(ctx, y, y + h, [
    [0, "#0b1430"],
    [1, "#25407a"],
  ]);
  ctx.fillRect(x, y, w, h);
  const rand = seeded(21);
  for (let i = 0; i < 26; i++) {
    circle(ctx, x + rand() * w, y + rand() * h * 0.8, rand() * 1.1 + 0.3, `rgba(255,255,255,${0.4 + rand() * 0.6})`);
  }
  ctx.save();
  ctx.shadowColor = "rgba(190, 210, 255, 0.9)";
  ctx.shadowBlur = 18;
  circle(ctx, x + w - 34, y + 24, 12, "#f4f1de");
  ctx.restore();
  circle(ctx, x + w - 28, y + 20, 11, "#14234d");
  // Distant rooftops.
  ctx.fillStyle = "#0a1022";
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  for (let i = 0; i <= 8; i++) ctx.lineTo(x + (i * w) / 8, y + h - 10 - ((i * 7) % 13));
  ctx.lineTo(x + w, y + h);
  ctx.fill();

  // Frame, mullions and sill.
  ctx.strokeStyle = "#9c8fb8";
  ctx.lineWidth = 6;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 4;
  line(ctx, x + w / 2, y, x + w / 2, y + h, "#9c8fb8", 4);
  line(ctx, x, y + h / 2, x + w, y + h / 2, "#9c8fb8", 4);
  ctx.fillStyle = "rgba(200, 220, 255, 0.08)";
  ctx.fillRect(x + 4, y + 4, w / 2 - 6, h / 2 - 6);
  fillRR(ctx, x - 10, y + h + 2, w + 20, 8, 2, "#b3a6cc");

  // Curtains with soft folds, a rod and tie-backs.
  line(ctx, x - 44, y - 6, x + w + 44, y - 6, "#c9b58a", 3);
  circle(ctx, x - 46, y - 6, 4, "#e0c98f");
  circle(ctx, x + w + 46, y - 6, 4, "#e0c98f");
  drawCurtain(ctx, x - 40, y - 6, 52, h + 20, false);
  drawCurtain(ctx, x + w - 12, y - 6, 52, h + 20, true);
}

function drawCurtain(ctx: Ctx, x: number, y: number, w: number, h: number, mirror: boolean): void {
  ctx.save();
  softShadow(ctx, 10, 4, 0.4);
  ctx.beginPath();
  if (!mirror) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.quadraticCurveTo(x + w * 0.45, y + h * 0.55, x + w * 0.7, y + h);
    ctx.lineTo(x, y + h);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w * 0.3, y + h);
    ctx.quadraticCurveTo(x + w * 0.55, y + h * 0.55, x, y);
  }
  ctx.closePath();
  const folds = hGradient(ctx, x, x + w, [
    [0, "#5a2340"],
    [0.2, "#7b3356"],
    [0.4, "#5f2644"],
    [0.6, "#82395c"],
    [0.8, "#5a2340"],
    [1, "#6e2d4e"],
  ]);
  ctx.fillStyle = folds;
  ctx.fill();
  ctx.restore();
  // Tie-back.
  const ty = y + h * 0.58;
  fillRR(ctx, mirror ? x + w * 0.35 : x + w * 0.1, ty, w * 0.55, 5, 2, "#d8b56a");
}

function drawWallDecor(ctx: Ctx): void {
  // Framed picture: moon over hills.
  ctx.save();
  softShadow(ctx, 8, 4, 0.5);
  fillRR(ctx, 418, 24, 84, 58, 3, "#c8a46a");
  ctx.restore();
  ctx.fillStyle = vGradient(ctx, 30, 76, [
    [0, "#2b3c6e"],
    [1, "#6a5a8c"],
  ]);
  ctx.fillRect(424, 30, 72, 46);
  circle(ctx, 476, 42, 6, "#f3e7c4");
  ctx.fillStyle = "#2a2a4a";
  ctx.beginPath();
  ctx.moveTo(424, 76);
  ctx.quadraticCurveTo(450, 52, 470, 66);
  ctx.quadraticCurveTo(484, 58, 496, 70);
  ctx.lineTo(496, 76);
  ctx.fill();

  // Small photo frames.
  ctx.save();
  softShadow(ctx, 6, 3, 0.5);
  fillRR(ctx, 808, 34, 40, 48, 3, "#e4dccb");
  fillRR(ctx, 856, 44, 34, 30, 3, "#3a2f2a");
  ctx.restore();
  ctx.fillStyle = vGradient(ctx, 38, 78, [
    [0, "#9fb7d6"],
    [1, "#d8b38a"],
  ]);
  ctx.fillRect(812, 38, 32, 40);
  circle(ctx, 828, 54, 6, "#7a5a48");
  ellipse(ctx, 828, 72, 10, 7, "#3f6c8a");
  ctx.fillStyle = "#c97a5a";
  ctx.fillRect(860, 48, 26, 22);

  // Tall plant in the corner.
  ctx.save();
  softShadow(ctx, 10, 4, 0.5);
  fillRR(ctx, 76, 74, 30, 28, 5, vGradient(ctx, 74, 102, [
    [0, "#c8754e"],
    [1, "#8e4c32"],
  ]));
  ctx.restore();
  const leaves: [number, number, number][] = [
    [-0.9, 46, 10],
    [-0.4, 58, 11],
    [0.1, 62, 11],
    [0.6, 54, 10],
    [1.0, 42, 9],
  ];
  for (const [angle, len, width] of leaves) {
    ctx.save();
    ctx.translate(91, 76);
    ctx.rotate(angle - Math.PI / 2);
    ctx.fillStyle = "#2f6b4c";
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, width / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    line(ctx, 0, 0, len, 0, "rgba(160, 220, 170, 0.35)");
    ctx.restore();
  }
}

function drawRug(ctx: Ctx, cx: number, cy: number, w: number, h: number): void {
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.save();
  softShadow(ctx, 10, 4, 0.35);
  fillRR(ctx, x, y, w, h, 22, "#2c3e63");
  ctx.restore();
  // Border bands.
  rr(ctx, x + 10, y + 10, w - 20, h - 20, 16);
  ctx.strokeStyle = "#d9c9a3";
  ctx.lineWidth = 3;
  ctx.stroke();
  rr(ctx, x + 18, y + 18, w - 36, h - 36, 12);
  ctx.strokeStyle = "rgba(217, 201, 163, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  // Central medallion.
  ctx.save();
  ctx.translate(cx, cy);
  ellipse(ctx, 0, 0, 62, 40, "#3d5482");
  ctx.strokeStyle = "#c9a45e";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(26, 0, 18, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ellipse(ctx, cx, cy, 10, 7, "#c9a45e");
  // Tassels on the short ends.
  for (let ty = y + 14; ty < y + h - 10; ty += 9) {
    line(ctx, x - 7, ty, x, ty, "#d9c9a3", 2);
    line(ctx, x + w, ty, x + w + 7, ty, "#d9c9a3", 2);
  }
}

function drawFloorProps(ctx: Ctx): void {
  // Slippers by the bed.
  for (const [sx, sy, a] of [
    [376, 544, -0.25],
    [394, 556, 0.15],
  ] as const) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    softShadow(ctx, 4, 2, 0.5);
    ellipse(ctx, 0, 0, 7, 13, "#b9506a");
    noShadow(ctx);
    ellipse(ctx, 0, -4, 5, 6, "#e8a0b4");
    ctx.restore();
  }
  // A book left on the floor.
  ctx.save();
  ctx.translate(560, 648);
  ctx.rotate(0.2);
  softShadow(ctx, 5, 2, 0.5);
  fillRR(ctx, -16, -11, 32, 22, 2, "#3e6b8a");
  noShadow(ctx);
  ctx.fillStyle = "#e8e0cc";
  ctx.fillRect(12, -10, 3, 20);
  ctx.restore();
}

// --- Lighting ------------------------------------------------------------

/**
 * Multiply lightmap: cool, dim ambient night with light pools from the
 * window (moonlight), the bedside lamp, the hallway and the alarm clock.
 */
function drawLightmap(ctx: Ctx, level: LevelDefinition): void {
  const right = level.room.x + level.room.width;
  ctx.fillStyle = "rgb(92, 98, 150)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = "blur(14px)";

  // Moonbeam falling from the window across the floor.
  const { x, width } = RoomFeatures.window;
  ctx.beginPath();
  ctx.moveTo(x + 6, 96);
  ctx.lineTo(x + width - 6, 96);
  ctx.lineTo(x + width + 170, 560);
  ctx.lineTo(x - 70, 560);
  ctx.closePath();
  ctx.fillStyle = vGradient(ctx, 90, 560, [
    [0, "rgba(130, 150, 225, 0.8)"],
    [1, "rgba(130, 150, 225, 0)"],
  ]);
  ctx.fill();
  ctx.fillStyle = radial(ctx, x + width / 2, 60, 160, [
    [0, "rgba(130, 150, 220, 0.6)"],
    [1, "rgba(130, 150, 220, 0)"],
  ]);
  ctx.fillRect(0, 0, GAME_WIDTH, 260);

  // Warm bedside lamp.
  const { lamp } = RoomFeatures;
  ctx.fillStyle = radial(ctx, lamp.x, lamp.y + 30, 330, [
    [0, "rgba(255, 170, 90, 0.95)"],
    [0.35, "rgba(220, 130, 70, 0.45)"],
    [1, "rgba(200, 110, 60, 0)"],
  ]);
  ctx.fillRect(0, 0, 900, 600);

  // Hallway light under the door.
  const { door } = RoomFeatures;
  ctx.fillStyle = radial(ctx, right, door.y + door.height / 2, 170, [
    [0, "rgba(255, 180, 100, 0.7)"],
    [1, "rgba(255, 180, 100, 0)"],
  ]);
  ctx.fillRect(right - 200, door.y - 150, 260, 400);

  // The alarm clock's red face.
  ctx.fillStyle = radial(ctx, 415, 150, 70, [
    [0, "rgba(255, 70, 70, 0.3)"],
    [1, "rgba(255, 70, 70, 0)"],
  ]);
  ctx.fillRect(330, 70, 170, 170);

  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
}

// --- Furniture -----------------------------------------------------------

/**
 * Footprint textures: the object's top face sits `height` px above its
 * footprint, with a front face below it, so it reads as 2.5D.
 */
export function footprintTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  height: number,
  draw: (ctx: Ctx, ox: number, oy: number) => void,
): void {
  makeTexture(scene, key, w + FOOT_PAD * 2, h + height + FOOT_PAD * 2, (ctx) => draw(ctx, FOOT_PAD, FOOT_PAD));
}

export function createFurnitureTextures(scene: Phaser.Scene, level: LevelDefinition): void {
  for (const piece of level.furniture) {
    const key = furnitureKey(piece.art);
    const H = FurnitureHeight[piece.art];
    footprintTexture(scene, key, piece.width, piece.height, H, (ctx, ox, oy) => {
      if (piece.art === "nightstand") drawNightstand(ctx, ox, oy, piece.width, piece.height, H);
      if (piece.art === "armchair") drawArmchair(ctx, ox, oy, piece.width, piece.height, H);
      if (piece.art === "toyChest") drawToyChest(ctx, ox, oy, piece.width, piece.height, H);
    });
  }
}

export function furnitureKey(art: FurnitureArt): string {
  return `furniture-${art}`;
}

/** Shared box: shadowed silhouette, lit top face, darker front face. */
function box(
  ctx: Ctx,
  ox: number,
  oy: number,
  w: number,
  h: number,
  H: number,
  top: [string, string],
  front: [string, string],
  radius = 8,
): void {
  ctx.save();
  softShadow(ctx, 16, 8, 0.55);
  fillRR(ctx, ox, oy, w, h + H, radius, front[1]);
  ctx.restore();
  fillRR(ctx, ox, oy + h - 4, w, H + 4, radius, vGradient(ctx, oy + h, oy + h + H, [
    [0, front[0]],
    [1, front[1]],
  ]));
  fillRR(ctx, ox, oy, w, h, radius, vGradient(ctx, oy, oy + h, [
    [0, top[0]],
    [1, top[1]],
  ]));
  rr(ctx, ox + 1, oy + 1, w - 2, h - 2, radius);
  ctx.strokeStyle = "rgba(255, 240, 220, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawNightstand(ctx: Ctx, ox: number, oy: number, w: number, h: number, H: number): void {
  box(ctx, ox, oy, w, h, H, ["#9a6a46", "#7f5538"], ["#6a452d", "#4e3220"]);
  // Drawer and knob on the front.
  rr(ctx, ox + 10, oy + h + 3, w - 20, H - 8, 4);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  circle(ctx, ox + w / 2, oy + h + H / 2, 3, "#e3c27a");
  // Bedside lamp in the back-right corner.
  const lx = ox + w - 18;
  const ly = oy + 16;
  ellipse(ctx, lx, ly + 10, 11, 5, "rgba(0,0,0,0.35)");
  ellipse(ctx, lx, ly + 8, 8, 4, "#c9a45e");
  ctx.beginPath();
  ctx.moveTo(lx - 9, ly - 8);
  ctx.lineTo(lx + 9, ly - 8);
  ctx.lineTo(lx + 13, ly + 6);
  ctx.lineTo(lx - 13, ly + 6);
  ctx.closePath();
  ctx.fillStyle = vGradient(ctx, ly - 8, ly + 6, [
    [0, "#fff1cf"],
    [1, "#f2c983"],
  ]);
  ctx.fill();
  ellipse(ctx, lx, ly - 8, 9, 3, "#fff7e2");
  // A paperback.
  fillRR(ctx, ox + 8, oy + 52, 26, 18, 2, "#7c3b4c");
  ctx.fillStyle = "#efe6d2";
  ctx.fillRect(ox + 31, oy + 53, 2, 16);
}

function drawArmchair(ctx: Ctx, ox: number, oy: number, w: number, h: number, H: number): void {
  const velvet: [string, string] = ["#3a7f84", "#2b6267"];
  ctx.save();
  softShadow(ctx, 18, 9, 0.55);
  fillRR(ctx, ox, oy, w, h + H, 18, "#1f4a4e");
  ctx.restore();
  // Front skirt.
  fillRR(ctx, ox + 4, oy + h - 6, w - 8, H + 6, 14, vGradient(ctx, oy + h, oy + h + H, [
    [0, "#24585c"],
    [1, "#173c40"],
  ]));
  // Backrest.
  fillRR(ctx, ox + 6, oy, w - 12, 44, 18, vGradient(ctx, oy, oy + 44, [
    [0, "#4b959a"],
    [1, velvet[1]],
  ]));
  // Tufting buttons.
  for (let i = 1; i < 5; i++) circle(ctx, ox + (w * i) / 5, oy + 20, 2.2, "rgba(0,0,0,0.3)");
  // Seat cushion between the arms.
  fillRR(ctx, ox + 30, oy + 38, w - 60, h - 30, 12, vGradient(ctx, oy + 38, oy + h + 8, [
    [0, velvet[0]],
    [1, velvet[1]],
  ]));
  // Arms.
  for (const ax of [ox, ox + w - 32]) {
    fillRR(ctx, ax, oy + 18, 32, h + 10, 14, vGradient(ctx, oy + 18, oy + h + 28, [
      [0, "#4f9ca1"],
      [1, "#2a6064"],
    ]));
    rr(ctx, ax + 2, oy + 20, 28, 20, 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
  }
  // Cream throw pillow and a plaid blanket over one arm.
  ctx.save();
  ctx.translate(ox + w / 2 + 14, oy + 54);
  ctx.rotate(-0.15);
  softShadow(ctx, 6, 3, 0.4);
  fillRR(ctx, -20, -14, 40, 28, 9, "#efe2c8");
  ctx.restore();
  ctx.save();
  softShadow(ctx, 6, 3, 0.4);
  fillRR(ctx, ox + 4, oy + 24, 30, 58, 6, "#a84a3d");
  ctx.restore();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = "rgba(255, 220, 180, 0.25)";
    ctx.fillRect(ox + 4, oy + 32 + i * 13, 30, 2);
    ctx.fillRect(ox + 10 + i * 7, oy + 24, 2, 58);
  }
}

function drawToyChest(ctx: Ctx, ox: number, oy: number, w: number, h: number, H: number): void {
  box(ctx, ox, oy, w, h, H, ["#8a5a8f", "#6d4473"], ["#55345a", "#3c2340"], 6);
  // Painted stripes on the lid and metal corners.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "rgba(255, 220, 140, 0.25)";
    ctx.fillRect(ox + 8, oy + 14 + i * 18, w - 16, 4);
  }
  for (const [cx, cy] of [
    [ox + 2, oy + 2],
    [ox + w - 14, oy + 2],
    [ox + 2, oy + h + H - 14],
    [ox + w - 14, oy + h + H - 14],
  ]) {
    fillRR(ctx, cx, cy, 12, 12, 3, "#c9a45e");
  }
  fillRR(ctx, ox + w / 2 - 8, oy + h + 2, 16, 12, 3, "#d8b56a");
  // A teddy bear sitting on the lid.
  const bx = ox + w - 40;
  const by = oy + 30;
  ctx.save();
  softShadow(ctx, 6, 3, 0.45);
  ellipse(ctx, bx, by + 12, 14, 13, "#b07a4a");
  ctx.restore();
  circle(ctx, bx, by - 6, 12, "#c08a58");
  circle(ctx, bx - 10, by - 15, 5, "#c08a58");
  circle(ctx, bx + 10, by - 15, 5, "#c08a58");
  circle(ctx, bx - 10, by - 15, 2.5, "#8a5a36");
  circle(ctx, bx + 10, by - 15, 2.5, "#8a5a36");
  ellipse(ctx, bx, by - 2, 5, 4, "#e6c49c");
  circle(ctx, bx - 4, by - 8, 1.6, "#2a1a10");
  circle(ctx, bx + 4, by - 8, 1.6, "#2a1a10");
  circle(ctx, bx, by - 3, 1.6, "#2a1a10");
  // A toy block.
  ctx.save();
  ctx.translate(ox + 32, oy + 36);
  ctx.rotate(0.2);
  softShadow(ctx, 5, 2, 0.45);
  fillRR(ctx, -11, -11, 22, 22, 3, "#e8b04a");
  ctx.restore();
}
