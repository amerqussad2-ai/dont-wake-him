/**
 * Render order inside the level. Furniture and characters are y-sorted
 * (deeper = further down the screen) between `ySort` and `light`.
 */
export const Depth = {
  room: 0,
  floorDecal: 10,
  floorFx: 20,
  ySortBase: 1000,
  light: 5000,
  glow: 5100,
  fx: 6000,
} as const;

/** Depth for something whose feet / footprint bottom is at `footY`. */
export function ySort(footY: number): number {
  return Depth.ySortBase + footY;
}
