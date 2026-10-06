/** Gameplay tuning values. Adjust balance here, not in scenes. */
export const PlayerTuning = {
  size: 28,
  walkSpeed: 210,
  sneakSpeed: 95,
  /** Max distance from the player's centre to an object's edge to interact. */
  interactRange: 56,
} as const;

export const NoiseTuning = {
  max: 100,
  /** Noise that fades away every second. */
  decayPerSecond: 4,
  walkPerSecond: 8,
  sneakPerSecond: 1.5,
  bump: 8,
  bumpCooldownMs: 700,
} as const;

export const SleepTuning = {
  /** Resting depth range the natural cycle moves within (0 = awake, 100 = deep). */
  min: 25,
  max: 90,
  /** Length of one full light→deep→light cycle in seconds. */
  cycleSeconds: 28,
  /** How much a unit of noise pulls sleep lighter. */
  disturbancePerNoise: 0.6,
  disturbanceRecoveryPerSecond: 3,
  /** Noise multiplier at depth 0 and depth 100. */
  lightSleepNoiseMultiplier: 1.5,
  deepSleepNoiseMultiplier: 0.5,
} as const;

/** Presentation-only values: they change how the game feels, not its rules. */
export const FeelTuning = {
  /** How quickly the player reaches / loses top speed (higher = snappier). */
  acceleration: 14,
  deceleration: 18,
  /** Pixels travelled between footstep effects. */
  stepDistance: 46,
  cameraZoom: 1.04,
  cameraLerp: 0.08,
  /** Noise levels where the sleeper starts to stir / toss and turn. */
  stirNoise: 35,
  restlessNoise: 70,
  /** Noise level where the HUD starts warning. */
  dangerNoise: 75,
  /** Alarm seconds left when the clock starts to look urgent. */
  alarmUrgentSeconds: 15,
} as const;
