import { describe, expect, it } from "vitest";
import { currentData } from "@data/index";
import { defaults, isVisible, layout } from "../types";
import {
  arVsPdr,
  mode,
  nextRoll,
  pdrFromAr,
  rollGains,
  switchArmorRating,
  switchGear,
  totalPdr,
} from "./model";

const data = currentData;
const p = defaults(arVsPdr.params);

describe("ar-vs-pdr", () => {
  it("switches where 10 armor rating stops adding more than 1% PDR (wiki curve: 0.10%/AR at 295-315)", () => {
    const { tie, win } = switchArmorRating(data);
    expect(tie).toBeCloseTo(295, 3);
    expect(win).toBeCloseTo(305, 3);
  });

  it("armor rating rolls win below the switch, PDR rolls above it", () => {
    const below = rollGains(200, 0, 0.65, data);
    const above = rollGains(400, 0, 0.65, data);
    expect(below.ar).toBeGreaterThan(below.pdr);
    expect(above.pdr).toBeGreaterThan(above.ar);
  });

  it("adds PDR from rolls flat before the cap", () => {
    expect(totalPdr(300, 0.05, 0.65, data)).toBeCloseTo(pdrFromAr(300, data) + 0.05, 12);
    expect(totalPdr(600, 0.1, 0.65, data)).toBe(0.65);
    expect(rollGains(600, 0.1, 0.65, data)).toEqual({ ar: 0, pdr: 0 });
  });

  it("Defense Mastery boosts gear armor rating only and raises the cap", () => {
    const m = mode(true, 30, data);
    expect(m.totalAr(200)).toBeCloseTo(200 * 1.15 + 30, 9);
    expect(m.cap).toBe(0.75);
    expect(mode(false, 30, data).totalAr(200)).toBe(230);
  });

  it("states the Defense Mastery switch in gear armor rating", () => {
    expect(switchGear(mode(true, 25, data), 295)).toBeCloseTo((295 - 25) / 1.15, 6);
    const r = arVsPdr.compute({ ...p, dm: true, arGear: 100, arRolls: 25 }, data);
    expect((r.verdict.headline.values.x as { value: number }).value).toBeCloseTo((295 - 25) / 1.15, 3);
  });

  it("tells what the same build should roll with the perk flipped", () => {
    const build = { ...p, arGear: 280, arRolls: 0 };
    expect(nextRoll(mode(false, 0, data), 280, 0, data).stat).toBe("armor rating");
    expect(nextRoll(mode(true, 0, data), 280, 0, data).stat).toBe("PDR");
    const r = arVsPdr.compute(build, data);
    expect(r.verdict.details[1]!.template).toContain("With Defense Mastery, the same build");
    expect(r.charts[0]!.series.map((s) => s.id)).toContain("switch-other");
  });

  it("keeps the same number of verdict lines in every state", () => {
    const count = (q: typeof p) => arVsPdr.compute(q, data).verdict.details.length;
    expect(count(p)).toBe(3);
    expect(count({ ...p, dm: true })).toBe(3);
    expect(count({ ...p, arGear: 600, pdr: 0.2 })).toBe(3);
  });

  it("always shows the armor rating split", () => {
    const visible = (dm: boolean) =>
      layout(arVsPdr)
        .flatMap((s) => s.items)
        .filter((i) => isVisible(arVsPdr, i, { ...p, dm }))
        .map((i) => (i.kind === "param" ? i.key : i.preset.id));
    expect(visible(false)).toEqual(["dm", "arGear", "arRolls", "pdr"]);
    expect(visible(true)).toEqual(["dm", "arGear", "arRolls", "pdr"]);
  });

  it("states the switch in gear armor rating without the perk too", () => {
    const r = arVsPdr.compute({ ...p, arGear: 100, arRolls: 25 }, data);
    expect(r.verdict.headline.template).toBe(
      "Roll PDR instead of armor rating once your gear armor rating reaches {x}.",
    );
    expect((r.verdict.headline.values.x as { value: number }).value).toBeCloseTo(270, 3);
  });

  it("always shows the total armor rating readout", () => {
    expect(arVsPdr.compute({ ...p, arGear: 250, arRolls: 30 }, data).readouts[0]).toMatchObject({
      id: "total-ar",
      value: { value: 280 },
    });
  });
});
