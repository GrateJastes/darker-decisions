import { describe, expect, it } from "vitest";
import { currentData } from "@data/index";
import { evaluate, inverse, slope } from "./curve";
import { damageReduction, mitigationMultiplier } from "./mitigation";
import { damage, scaledDamage, afterAdditional } from "./damage";
import { crossover, findCrossings, range, solveMonotone } from "./analysis";

const mdr = currentData.curves.magicResistanceToMdr;
const pdr = currentData.curves.armorRatingToPdr;
const rules = { penetrationCap: currentData.caps.penetration };

describe("curve", () => {
  it("hits wiki breakpoints exactly", () => {
    expect(evaluate(mdr, 85)).toBeCloseTo(0.23, 10);
    expect(evaluate(mdr, 280)).toBeCloseTo(0.62, 10);
    expect(evaluate(pdr, 75)).toBeCloseTo(0.1245, 10);
  });

  it("interpolates linearly with the wiki's per-point slopes", () => {
    expect(evaluate(mdr, 63)).toBeCloseTo(0.15 + 10 * 0.0025, 10);
    expect(slope(mdr, 100)).toBeCloseTo(0.002, 10);
    expect(slope(pdr, 100)).toBeCloseTo(0.0015, 10);
  });

  it("inverse undoes evaluate", () => {
    for (const x of [-20, 0, 33, 120, 300]) expect(inverse(mdr, evaluate(mdr, x))).toBeCloseTo(x, 8);
  });
});

describe("mitigation", () => {
  it("caps damage reduction", () => {
    expect(damageReduction({ curve: mdr, rating: 500, cap: 0.65 })).toBe(0.65);
    expect(damageReduction({ curve: mdr, rating: 85, bonus: 0.05, cap: 0.65 })).toBeCloseTo(0.28, 10);
  });

  it("applies penetration multiplicatively to DR", () => {
    expect(mitigationMultiplier({ damageReduction: 0.4, penetration: 0.25, penetrationCap: 1 })).toBeCloseTo(
      0.7,
      10,
    );
  });

  it("gives no benefit past 100% pen", () => {
    expect(mitigationMultiplier({ damageReduction: 0.4, penetration: 1.5, penetrationCap: 1 })).toBe(1);
  });

  it("does nothing against non-positive DR", () => {
    expect(mitigationMultiplier({ damageReduction: -0.1, penetration: 0.5, penetrationCap: 1 })).toBeCloseTo(
      1.1,
      10,
    );
    expect(mitigationMultiplier({ damageReduction: 0, penetration: 0.5, penetrationCap: 1 })).toBe(1);
  });
});

describe("damage formula", () => {
  it("matches the wiki Scaling example (Curse of Pain DoT)", () => {
    expect(scaledDamage({ baseDamage: 10, gearDamage: 5, powerBonus: 0.24, scaling: 0.5 })).toBeCloseTo(
      14,
      10,
    );
  });

  it("matches the wiki Rupture example", () => {
    expect(
      afterAdditional({ baseDamage: 20, powerBonus: -0.17, additionalDamage: 10, scaling: 0.5 }),
    ).toBeCloseTo(23.3, 10);
  });

  it("composes all stages", () => {
    const d = damage(
      { baseDamage: 25, gearDamage: 5, powerBonus: 0.2, additionalDamage: 3, scaling: 1, penetration: 0.1 },
      { damageReduction: 0.3 },
      rules,
    );
    expect(d).toBeCloseTo((30 * 1.2 + 3) * (1 - 0.3 * 0.9), 10);
  });
});

describe("analysis", () => {
  it("finds crossings by bisection", () => {
    const [x] = findCrossings(range(0, 10, 10), (x) => x * x, 2);
    expect(x).toBeCloseTo(Math.SQRT2, 8);
  });

  it("finds where one function overtakes another", () => {
    const [x] = crossover(
      range(0, 10, 20),
      (x) => 2 * x,
      (x) => x + 3,
    );
    expect(x).toBeCloseTo(3, 8);
  });

  it("solves for the smallest x reaching a target on a monotone function", () => {
    expect(solveMonotone((x) => 2 * x, 3, 0, 10)).toBeCloseTo(1.5, 8);
    expect(solveMonotone((x) => 2 * x, -1, 0, 10)).toBe(0);
    expect(solveMonotone((x) => 2 * x, 30, 0, 10)).toBeUndefined();
  });
});
