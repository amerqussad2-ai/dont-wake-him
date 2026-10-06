/** Keys used to register and start Phaser scenes. */
export const SceneKeys = {
  Main: "MainScene",
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
