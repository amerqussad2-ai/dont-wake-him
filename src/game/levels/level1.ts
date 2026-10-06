import type { LevelDefinition } from "@/game/types";

/** Level 1 — The Bedroom. Pure data; the scene builds everything from this. */
export const level1: LevelDefinition = {
  name: "The Bedroom",
  room: { x: 60, y: 110, width: 1160, height: 580 },
  playerStart: { x: 1150, y: 600 },
  bed: { x: 120, y: 250, width: 230, height: 320 },
  furniture: [
    { x: 370, y: 140, width: 90, height: 80, art: "nightstand" },
    { x: 640, y: 420, width: 170, height: 90, art: "armchair" },
    { x: 120, y: 600, width: 160, height: 70, art: "toyChest" },
  ],
  interactables: [
    {
      id: "key",
      label: "Key",
      objective: "Find the drawer key",
      action: "Pick up",
      area: { x: 1010, y: 300, width: 26, height: 14 },
      color: 0xf2c94c,
      noise: 10,
      effect: "pickup",
    },
    {
      id: "drawer",
      label: "Drawer",
      objective: "Open the drawer and take the wallet",
      action: "Open",
      area: { x: 860, y: 130, width: 170, height: 70 },
      color: 0x7a5a3c,
      noise: 32,
      effect: "open",
      requires: "key",
      solid: true,
      lockedHint: "Locked. Find the key first.",
    },
    {
      id: "alarm",
      label: "Alarm",
      objective: "Switch off the alarm clock before it rings",
      action: "Switch off",
      area: { x: 395, y: 158, width: 40, height: 28 },
      color: 0xd64545,
      noise: 18,
      effect: "switch",
    },
  ],
  alarmSeconds: 80,
};
