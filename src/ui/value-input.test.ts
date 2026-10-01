import { describe, expect, it } from "vitest";
import { editableText, parseEditable } from "./format";
import { commitValue } from "./ValueInput";

describe("typed values", () => {
  it("parses percent input in percent units", () => {
    expect(parseEditable("40", "percent")).toBeCloseTo(0.4, 12);
    expect(parseEditable("36,5 %", "percent")).toBeCloseTo(0.365, 12);
    expect(parseEditable("-12", "percent")).toBeCloseTo(-0.12, 12);
    expect(parseEditable("abc", "percent")).toBeUndefined();
    expect(parseEditable("", "rating")).toBeUndefined();
  });

  it("round-trips the editable text", () => {
    expect(editableText(0.365, "percent")).toBe("36.5");
    expect(editableText(0.15, "scale")).toBe("0.15");
    expect(parseEditable(editableText(0.365, "percent"), "percent")).toBeCloseTo(0.365, 12);
  });

  it("clamps, keeps typed precision finer than the slider step, and whole armor rating", () => {
    expect(commitValue(0.364, 0, 1, 0.005, "percent")).toBe(0.364);
    expect(commitValue(0.36412, 0, 1, 0.005, "percent")).toBe(0.364);
    expect(commitValue(9, 0, 1, 0.005, "percent")).toBe(1);
    expect(commitValue(-3, -0.5, 1.5, 0.005, "percent")).toBe(-0.5);
    expect(commitValue(301.4, 0, 600, 1, "rating")).toBe(301);
  });
});
