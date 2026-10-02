import { describe, expect, it } from "vitest";
import { currentData } from "@data/index";
import { activePreset, defaults, layout, presetPatch } from "../types";
import { switchPoint } from "../power-vs-pen/model";
import { ppbVsArmorpen } from "./model";

const data = currentData;
const p = defaults(ppbVsArmorpen.params);
const group = ppbVsArmorpen.presets![0]!;
const pick = (from: typeof p, id: string) => ({
  ...from,
  ...presetPatch(
    group,
    group.options.find((o) => o.value === id)!,
  ),
});

describe("ppb-vs-armorpen", () => {
  it("defaults to a Rare Longsword with no armor pen", () => {
    expect(activePreset(group, p)).toBe("physical-weapon-longsword-rare");
    expect(p.wpen).toBe(0);
  });

  it("offers only physical sources", () => {
    const ids = new Set(data.sources.filter((s) => s.school === "physical").map((s) => s.id));
    expect(group.options.every((o) => ids.has(o.value))).toBe(true);
    expect(group.options.length).toBeGreaterThan(100);
  });

  it("matches the closed-form switch point (1-for-1)", () => {
    const plain = { ...p, base: 40, scaling: 1, gear: 0, add: 0, pen: 0, wpen: 0 };
    for (const dr of [0.2, 0.3, 0.45]) {
      expect(switchPoint(plain, dr, data)).toBeCloseTo(Math.max(0, (1 - 2 * dr) / dr), 6);
    }
  });

  it("weapons fill in their own armor pen, skills leave it alone", () => {
    const crossbow = pick(p, "physical-weapon-crossbow-rare");
    expect(crossbow.wpen).toBeCloseTo(0.3, 9);
    expect(pick(crossbow, "physical-fighter-shieldslam").wpen).toBeCloseTo(0.3, 9);
    expect(pick(crossbow, "physical-weapon-longsword-rare").wpen).toBe(0);
  });

  it("built-in armor pen pushes the switch later", () => {
    const crossbow = pick(p, "physical-weapon-crossbow-rare");
    expect(switchPoint(crossbow, 0.4, data)!).toBeGreaterThan(
      switchPoint({ ...crossbow, wpen: 0 }, 0.4, data)!,
    );
  });

  it("words the verdict in physical terms", () => {
    const { headline, details } = ppbVsArmorpen.compute({ ...p, dr: 0.35 }, data).verdict;
    expect(headline.template).toBe("Against {dr} PDR, add armor pen once you reach {at} PPB.");
    expect(details[0]!.template).toContain("{pb} PPB");
  });
});

describe("ppb-vs-armorpen inputs", () => {
  it("has no weapon damage roll or scaling input; additional physical damage stays", () => {
    const damage = layout(ppbVsArmorpen).find((s) => s.id === "damage")!;
    expect(damage.items.map((i) => (i.kind === "param" ? i.key : i.preset.id))).toEqual([
      "source",
      "base",
      "wpen",
      "add",
    ]);
  });
});

describe("ppb-vs-armorpen fresh-build statement", () => {
  const line = (q: typeof p) => ppbVsArmorpen.compute(q, data).verdict.details[1]!;

  it("ignores PPB and armor pen you already have", () => {
    expect(line({ ...p, pb: 0.8, pen: 0.2 })).toEqual(line(p));
  });

  it("is 50% PDR for a plain hit with no pen", () => {
    expect(line(p).template).toBe(
      "From 0 PPB and 0 armor pen, invest in armor pen straight away against targets with {r0} PDR or more.",
    );
    expect((line({ ...p, add: 0 }).values.r0 as { value: number }).value).toBeCloseTo(0.5, 6);
  });

  it("counts the weapon's own armor pen", () => {
    const crossbow = pick(p, "physical-weapon-crossbow-rare");
    expect(line(crossbow).template).toContain("only your weapon's {wpen} armor pen");
    expect((line(crossbow).values.r0 as { value: number }).value).toBeGreaterThan(0.5);
  });

  it("is always shown", () => {
    for (const q of [p, { ...p, scaling: 0.1 }, { ...p, add: 15, base: 1 }]) {
      expect(ppbVsArmorpen.compute(q, data).verdict.details).toHaveLength(2);
    }
  });
});
