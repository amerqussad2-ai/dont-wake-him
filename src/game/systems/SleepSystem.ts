import { SleepTuning } from "@/game/config/gameplay";

/**
 * Sleep depth (0 = awake, 100 = deep). It drifts through a natural cycle and
 * is pulled lighter by noise. Lighter sleep makes every noise count for more.
 */
export class SleepSystem {
  private elapsed = 0;
  private disturbance = 0;
  private readonly phase = Math.random() * Math.PI * 2;

  get depth(): number {
    const { min, max, cycleSeconds } = SleepTuning;
    const t = (this.elapsed / cycleSeconds) * Math.PI * 2 + this.phase;
    // Two layered waves so the cycle feels less mechanical.
    const wave = 0.75 * Math.sin(t) + 0.25 * Math.sin(t * 2.7);
    const natural = min + ((wave + 1) / 2) * (max - min);
    return clamp(natural - this.disturbance, 0, 100);
  }

  /** Multiplier applied to any noise the player makes right now. */
  get noiseMultiplier(): number {
    const { lightSleepNoiseMultiplier: light, deepSleepNoiseMultiplier: deep } =
      SleepTuning;
    return light + (deep - light) * (this.depth / 100);
  }

  disturb(noise: number): void {
    this.disturbance = Math.min(
      60,
      this.disturbance + noise * SleepTuning.disturbancePerNoise,
    );
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.disturbance = Math.max(
      0,
      this.disturbance - SleepTuning.disturbanceRecoveryPerSecond * deltaSeconds,
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
