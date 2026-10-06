/** Shared visual constants for the game canvas. */
export const Colors = {
  bedroomBackground: "#14121f",
  title: "#c9c3e6",
  text: "#e6e3f2",
  mutedText: "#8f8aa8",
  danger: "#ff6b6b",
  warning: "#f2c94c",
  success: "#7ee2a8",
} as const;

/** Numeric colours for shapes. */
export const Palette = {
  floor: 0x221e33,
  rug: 0x2e2745,
  wall: 0x0e0c17,
  window: 0x34406b,
  door: 0x5a4a3a,
  bedFrame: 0x4a3a2c,
  mattress: 0x6b6f8f,
  pillow: 0xd8d4ea,
  blanket: 0x3f5a8a,
  skin: 0xc9a27e,
  player: 0x9be7ff,
  playerSneak: 0x4fa3bf,
  highlight: 0xfff3a3,
  meterBg: 0x1d1a2b,
  meterFrame: 0x4b4566,
  noiseLow: 0x6fd08c,
  noiseMid: 0xf2c94c,
  noiseHigh: 0xeb5757,
  sleep: 0x7b8cff,
  overlay: 0x05040a,
} as const;

export const Fonts = {
  primary: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
} as const;
