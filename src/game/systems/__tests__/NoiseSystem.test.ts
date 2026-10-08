import { describe, expect, it } from "vitest";

import { NoiseTuning } from "@/game/config/gameplay";
import { NoiseSystem } from "@/game/systems/NoiseSystem";

const { max: MAX, decayPerSecond: DECAY } = NoiseTuning;

describe("NoiseSystem", () => {
  it("starts silent", () => {
    const noise = new NoiseSystem();
    expect(noise.level).toBe(0);
    expect(noise.peak).toBe(0);
    expect(noise.isMaxed).toBe(false);
  });

  it("accumulates added noise and reports the amount actually added", () => {
    const noise = new NoiseSystem();
    expect(noise.add(10)).toBe(10);
    expect(noise.add(15.5)).toBe(15.5);
    expect(noise.level).toBe(25.5);
  });

  it("treats adding zero as a no-op", () => {
    const noise = new NoiseSystem();
    noise.add(12);
    expect(noise.add(0)).toBe(0);
    expect(noise.level).toBe(12);
  });

  it(`clamps at the maximum (${MAX}) and only reports the part that fit`, () => {
    const noise = new NoiseSystem();
    noise.add(MAX - 10);
    expect(noise.add(30)).toBe(10);
    expect(noise.level).toBe(MAX);
    expect(noise.isMaxed).toBe(true);
  });

  it("fill() jumps straight to the maximum from any level", () => {
    const noise = new NoiseSystem();
    noise.add(37);
    noise.fill();
    expect(noise.level).toBe(MAX);
    expect(noise.isMaxed).toBe(true);
    expect(noise.peak).toBe(MAX);
  });

  it(`decays by ${DECAY} per second of elapsed time`, () => {
    const noise = new NoiseSystem();
    noise.add(50);
    noise.update(1);
    expect(noise.level).toBeCloseTo(50 - DECAY);
    noise.update(2.5);
    expect(noise.level).toBeCloseTo(50 - DECAY * 3.5);
  });

  it("decays the same whether time arrives in one step or many frames", () => {
    const oneStep = new NoiseSystem();
    const perFrame = new NoiseSystem();
    oneStep.add(60);
    perFrame.add(60);
    oneStep.update(2);
    for (let i = 0; i < 120; i++) perFrame.update(1 / 60);
    expect(perFrame.level).toBeCloseTo(oneStep.level, 6);
  });

  it("never decays below zero", () => {
    const noise = new NoiseSystem();
    noise.add(3);
    noise.update(10);
    expect(noise.level).toBe(0);
    noise.update(5);
    expect(noise.level).toBe(0);
  });

  it("stays at the maximum once maxed: decay stops (the wake-up is final)", () => {
    const noise = new NoiseSystem();
    noise.add(MAX);
    noise.update(30);
    expect(noise.level).toBe(MAX);
    expect(noise.isMaxed).toBe(true);
  });

  it("tracks the highest level reached, even after it decays", () => {
    const noise = new NoiseSystem();
    noise.add(60);
    noise.update(5);
    expect(noise.level).toBeCloseTo(60 - DECAY * 5);
    expect(noise.peak).toBe(60);

    noise.add(10);
    expect(noise.peak).toBe(60);

    noise.add(30);
    expect(noise.peak).toBeCloseTo(noise.level);
    expect(noise.peak).toBeGreaterThan(60);
  });

  it("keeps level and peak within 0..max over a long mixed sequence", () => {
    // Deterministic pseudo-random sequence so the test is repeatable.
    let seed = 12345;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const noise = new NoiseSystem();
    for (let i = 0; i < 5000 && !noise.isMaxed; i++) {
      if (next() < 0.3) noise.add(next() * 12);
      noise.update(next() * 0.1);
      expect(noise.level).toBeGreaterThanOrEqual(0);
      expect(noise.level).toBeLessThanOrEqual(MAX);
      expect(noise.peak).toBeGreaterThanOrEqual(noise.level);
      expect(noise.peak).toBeLessThanOrEqual(MAX);
    }
  });
});
