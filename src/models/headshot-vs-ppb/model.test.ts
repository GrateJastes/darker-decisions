import { describe, expect, it } from "vitest";
import { currentData } from "@data/index";
import { defaults, layout } from "../types";
import { effectiveReduction, gains, headMultiplier, headshotVsPpb, requiredRate, switchBonus } from "./model";

const data = currentData;
const p = defaults(headshotVsPpb.params);
const plain = { ...p, base: 40, scaling: 1, add: 0, pb: 0.3, hsr: 0, hsp: 0 };

describe("headshot-vs-ppb", () => {
  it("adds headshot bonus to 150%, subtracts reduction and caps the bonus at 30%", () => {
    expect(headMultiplier(0.2, 0, data)).toBeCloseTo(1.7, 9);
    expect(headMultiplier(0.15, 0.2, data)).toBeCloseTo(1.45, 9);
    expect(headMultiplier(0.5, 0, data)).toBeCloseTo(1.8, 9);
  });

  it("matches the closed form for a plain hit (2% headshot damage vs 1% PPB)", () => {
    expect(requiredRate(plain, 0, data)).toBeCloseTo(1 / (2 * 1.3 - 0.5), 9);
    expect(switchBonus(plain, 0.8, data)).toBeCloseTo(2 * 1.3 - 1 / 0.8 - 0.5, 9);
  });

  it("the switch point is where both rolls add the same damage", () => {
    const rate = 0.5;
    const at = switchBonus(plain, rate, data);
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(0.3);
    const g = gains({ ...plain, hsb: at }, rate, data);
    expect(g.hs).toBeCloseTo(g.pb, 6);
  });

  it("target headshot reduction lets you stack more headshot damage", () => {
    expect(switchBonus({ ...plain, hsr: 0.15 }, 0.6, data)).toBeCloseTo(
      switchBonus(plain, 0.6, data) + 0.15,
      9,
    );
  });

  it("headshot penetration cuts the target's headshot reduction", () => {
    expect(effectiveReduction({ hsr: 0.2, hsp: 0.5 })).toBeCloseTo(0.1, 9);
    expect(switchBonus({ ...plain, hsr: 0.2, hsp: 0.5 }, 0.6, data)).toBeCloseTo(
      switchBonus({ ...plain, hsr: 0.1 }, 0.6, data),
      9,
    );
    expect(switchBonus({ ...plain, hsp: 1 }, 0.6, data)).toBeCloseTo(switchBonus(plain, 0.6, data), 9);
  });

  it("more PPB makes headshot damage pay off sooner", () => {
    expect(requiredRate({ ...plain, pb: 0.6 }, 0, data)!).toBeLessThan(requiredRate(plain, 0, data)!);
  });

  it("past the cap headshot damage adds nothing", () => {
    expect(gains({ ...plain, hsb: 0.3 }, 0.9, data).hs).toBe(0);
  });

  it("keeps the verdict at two detail lines", () => {
    for (const q of [
      p,
      { ...p, hsb: 0.35 },
      { ...p, rate: 0 },
      { ...p, rate: 1, pb: 1.5 },
      { ...p, pb: -0.5 },
    ]) {
      expect(headshotVsPpb.compute(q, data).verdict.details).toHaveLength(2);
    }
  });

  it("lays out damage and target as inputs, rate and what you have under the chart", () => {
    expect(layout(headshotVsPpb).map((s) => [s.id, s.placement])).toEqual([
      ["damage", "inputs"],
      ["target", "inputs"],
      ["rate", "chart"],
      ["have", "chart"],
    ]);
  });
});
