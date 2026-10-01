import { describe, expect, it } from "vitest";
import { currentData } from "@data/index";
import { activePreset, defaults, layout, presetPatch } from "../types";
import { gains, mdbVsMagpen, penFromStartAt, switchPoint } from "./model";

const data = currentData;
const p = defaults(mdbVsMagpen.params);

describe("mdb-vs-magpen", () => {
  it("matches the closed-form switch point (1-for-1)", () => {
    for (const mdr of [0.2, 0.3, 0.45]) {
      const expected = Math.max(0, (1 - 2 * mdr) / mdr);
      expect(
        switchPoint({ ...p, base: 30, scaling: 1, gear: 0, add: 0, pen: 0, wpen: 0 }, mdr, data),
      ).toBeCloseTo(expected, 6);
    }
  });

  it("solves negative switch points for tanky targets", () => {
    const plain = { ...p, base: 30, scaling: 1, gear: 0, add: 0, pen: 0, wpen: 0 };
    expect(switchPoint(plain, 0.6, data)).toBeCloseTo((1 - 1.2) / 0.6, 6);
  });

  it("extends the y axis below zero only for negative MPB", () => {
    const yDomain = (mpb: number) => mdbVsMagpen.compute({ ...p, mpb }, data).charts[0]!.y.domain;
    expect(yDomain(0.3)).toEqual([0, 1.5]);
    expect(yDomain(-0.1)).toEqual([-0.25, 1.5]);
    expect(yDomain(-0.5)).toEqual([-0.5, 1.5]);
  });

  it("magic pen wins from the start at 50% MDR for a plain spell", () => {
    expect(penFromStartAt({ ...p, pen: 0, wpen: 0, gear: 0, add: 0, scaling: 1 }, data)).toBeCloseTo(0.5, 6);
  });

  it("tankier targets bring the switch earlier", () => {
    expect(switchPoint(p, 0.35, data)!).toBeLessThan(switchPoint(p, 0.25, data)!);
  });

  it("pen already on the kit pushes the switch later", () => {
    expect(switchPoint({ ...p, pen: 0.2 }, 0.3, data)!).toBeGreaterThan(switchPoint(p, 0.3, data)!);
  });

  it("lower scaling brings the switch earlier, since pen is not scaled", () => {
    expect(switchPoint({ ...p, scaling: 0.5 }, 0.3, data)!).toBeLessThan(switchPoint(p, 0.3, data)!);
  });

  it("never switches against non-positive MDR", () => {
    expect(gains(p, 0.3, 0, data).pen).toBe(0);
    expect(switchPoint(p, 0, data)).toBeUndefined();
  });

  it("defaults show Fireball hit", () => {
    expect(activePreset(mdbVsMagpen.presets![0]!, p)).toBe("wizard-fireball-hit");
  });

  it("remembers the picked source among sources with identical stats", () => {
    const group = mdbVsMagpen.presets![0]!;
    const option = group.options.find((o) => o.value === "wizard-chainlightning-hit")!;
    const picked = { ...p, ...presetPatch(group, option) };
    expect(picked.base).toBe(p.base);
    expect(activePreset(group, picked)).toBe("wizard-chainlightning-hit");
    expect(activePreset(group, { ...picked, base: 31 })).toBeUndefined();
  });

  it("weapon pen and other pen add up", () => {
    expect(switchPoint({ ...p, wpen: 0.1, pen: 0.05 }, 0.3, data)).toBeCloseTo(
      switchPoint({ ...p, wpen: 0, pen: 0.15 }, 0.3, data)!,
      9,
    );
  });

  it("lays out damage in the inputs, then target and have under the chart", () => {
    const sections = layout(mdbVsMagpen);
    expect(sections.map((s) => [s.id, s.placement])).toEqual([
      ["damage", "inputs"],
      ["target", "chart"],
      ["have", "chart"],
    ]);
    expect(sections[0]!.items[0]).toMatchObject({ kind: "preset" });
  });

  it("switch curve stays inside the chart", () => {
    const [chart] = mdbVsMagpen.compute({ ...p, mdr: 0.2 }, data).charts;
    for (const pt of chart!.series[0]!.points) expect(pt.y).toBeLessThanOrEqual(1.5 + 1e-9);
    expect(chart!.series[0]!.points[0]!.y).toBeCloseTo(1.5, 6);
  });

  it("words the headline around pen you already have", () => {
    const headline = (q: typeof p) => mdbVsMagpen.compute(q, data).verdict.headline.template;
    expect(headline({ ...p, mdr: 0.35, pen: 0, wpen: 0 })).toContain("add magic pen once you reach");
    expect(headline({ ...p, mdr: 0.35, pen: 0.05, wpen: 0.1 })).toContain("with your {pen} magic pen");
  });
});
