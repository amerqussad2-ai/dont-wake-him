import { afterEach, describe, expect, it, vi } from "vitest";

import { SleepTuning } from "@/game/config/gameplay";
import { SleepSystem } from "@/game/systems/SleepSystem";

const {
  min: NATURAL_MIN,
  max: NATURAL_MAX,
  cycleSeconds: CYCLE,
  disturbancePerNoise: PER_NOISE,
  disturbanceRecoveryPerSecond: RECOVERY,
  lightSleepNoiseMultiplier: LIGHT,
  deepSleepNoiseMultiplier: DEEP,
} = SleepTuning;

/** Largest disturbance SleepSystem allows (its internal cap). */
const DISTURBANCE_CAP = 60;

/**
 * SleepSystem picks a random starting point in its cycle via Math.random().
 * Tests that compare two instances pin that value from the test side;
 * production code is unchanged.
 */
function createAtPhase(random: number): SleepSystem {
  const spy = vi.spyOn(Math, "random").mockReturnValue(random);
  const sleep = new SleepSystem();
  spy.mockRestore();
  return sleep;
}

const PHASES = Array.from({ length: 20 }, (_, i) => i / 20);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SleepSystem", () => {
  it(`keeps undisturbed depth within its natural range (${NATURAL_MIN}–${NATURAL_MAX}) for any starting point`, () => {
    for (const phase of PHASES) {
      const sleep = createAtPhase(phase);
      for (let t = 0; t <= 120; t += 0.25) {
        expect(sleep.depth).toBeGreaterThanOrEqual(NATURAL_MIN - 1e-9);
        expect(sleep.depth).toBeLessThanOrEqual(NATURAL_MAX + 1e-9);
        sleep.update(0.25);
      }
    }
  });

  it("drifts noticeably over one natural cycle", () => {
    for (const phase of PHASES) {
      const sleep = createAtPhase(phase);
      let low = Infinity;
      let high = -Infinity;
      for (let t = 0; t <= CYCLE; t += 0.1) {
        low = Math.min(low, sleep.depth);
        high = Math.max(high, sleep.depth);
        sleep.update(0.1);
      }
      expect(high - low).toBeGreaterThan(30);
    }
  });

  it("keeps depth within 0–100 even when maximally disturbed", () => {
    for (const phase of PHASES) {
      const sleep = createAtPhase(phase);
      for (let i = 0; i < 400; i++) {
        sleep.disturb(1000);
        sleep.update(0.3);
        expect(sleep.depth).toBeGreaterThanOrEqual(0);
        expect(sleep.depth).toBeLessThanOrEqual(100);
      }
    }
  });

  it(`keeps the noise multiplier between ${DEEP} (deep) and ${LIGHT} (light)`, () => {
    for (const phase of PHASES) {
      const sleep = createAtPhase(phase);
      for (let i = 0; i < 300; i++) {
        if (i % 7 === 0) sleep.disturb(i % 3 === 0 ? 200 : 5);
        sleep.update(0.2);
        expect(sleep.noiseMultiplier).toBeGreaterThanOrEqual(DEEP);
        expect(sleep.noiseMultiplier).toBeLessThanOrEqual(LIGHT);
      }
    }
  });

  it("maps depth to the multiplier linearly: deeper sleep means quieter noise", () => {
    const sleep = createAtPhase(0.3);
    for (let i = 0; i < 200; i++) {
      const expected = LIGHT + (DEEP - LIGHT) * (sleep.depth / 100);
      expect(sleep.noiseMultiplier).toBeCloseTo(expected, 10);
      sleep.update(0.37);
    }
  });

  it("makes sleep lighter immediately by noise × disturbancePerNoise (any starting point)", () => {
    // Holds for every phase: natural depth is at least NATURAL_MIN, so no clamping occurs.
    const sleep = new SleepSystem();
    const before = sleep.depth;
    sleep.disturb(10);
    expect(sleep.depth).toBeCloseTo(before - 10 * PER_NOISE, 10);
  });

  it("makes noise count for more right after a disturbance", () => {
    const sleep = new SleepSystem();
    const before = sleep.noiseMultiplier;
    sleep.disturb(10);
    expect(sleep.noiseMultiplier).toBeCloseTo(before + ((LIGHT - DEEP) * 10 * PER_NOISE) / 100, 10);
  });

  it(`caps the disturbance at ${DISTURBANCE_CAP} depth points`, () => {
    for (const phase of PHASES) {
      const calm = createAtPhase(phase);
      const shaken = createAtPhase(phase);
      shaken.disturb(10_000);
      expect(calm.depth - shaken.depth).toBeCloseTo(Math.min(DISTURBANCE_CAP, calm.depth), 10);
    }
  });

  it(`recovers from a disturbance at ${RECOVERY} depth points per second, never overshooting`, () => {
    const calm = createAtPhase(0.6);
    const shaken = createAtPhase(0.6);
    shaken.disturb(10); // 10 × 0.6 = 6 points lighter

    calm.update(1);
    shaken.update(1);
    expect(calm.depth - shaken.depth).toBeCloseTo(10 * PER_NOISE - RECOVERY, 10);

    calm.update(5);
    shaken.update(5);
    expect(calm.depth - shaken.depth).toBeCloseTo(0, 10);
  });

  it("follows the same cycle for equal starting points (only the start is random)", () => {
    const a = createAtPhase(0.42);
    const b = createAtPhase(0.42);
    for (let i = 0; i < 100; i++) {
      a.update(0.5);
      b.update(0.25);
      b.update(0.25);
      expect(a.depth).toBeCloseTo(b.depth, 9);
    }
  });

  it("stays finite and in range across many frame-sized updates with periodic noise", () => {
    const sleep = new SleepSystem();
    for (let frame = 0; frame < 20_000; frame++) {
      if (frame % 90 === 0) sleep.disturb(18);
      sleep.update(1 / 60);
    }
    expect(Number.isFinite(sleep.depth)).toBe(true);
    expect(sleep.depth).toBeGreaterThanOrEqual(0);
    expect(sleep.depth).toBeLessThanOrEqual(100);
  });
});
