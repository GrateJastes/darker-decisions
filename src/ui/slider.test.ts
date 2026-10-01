import { describe, expect, it } from "vitest";
import { snap } from "./Slider";

describe("slider snapping", () => {
  it("snaps values near a sticky point and leaves others alone", () => {
    expect(snap(0.015, [0], 0.02)).toBe(0);
    expect(snap(-0.02, [0], 0.02)).toBe(0);
    expect(snap(0.025, [0], 0.02)).toBe(0.025);
  });
});
