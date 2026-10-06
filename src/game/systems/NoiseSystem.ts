import { NoiseTuning } from "@/game/config/gameplay";

/** Tracks the room's noise level (0–100). Pure logic, no Phaser dependency. */
export class NoiseSystem {
  private value = 0;
  private peakValue = 0;

  get level(): number {
    return this.value;
  }

  get peak(): number {
    return this.peakValue;
  }

  get isMaxed(): boolean {
    return this.value >= NoiseTuning.max;
  }

  /** Adds noise and returns the amount actually added. */
  add(amount: number): number {
    const before = this.value;
    this.value = Math.min(NoiseTuning.max, this.value + amount);
    this.peakValue = Math.max(this.peakValue, this.value);
    return this.value - before;
  }

  fill(): void {
    this.add(NoiseTuning.max);
  }

  update(deltaSeconds: number): void {
    if (this.isMaxed) return;
    this.value = Math.max(0, this.value - NoiseTuning.decayPerSecond * deltaSeconds);
  }
}
