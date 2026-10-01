import { describe, expect, it } from "vitest";
import { currentData, snapshots } from "./index";

describe("game data snapshots", () => {
  it("all snapshots validate and have unique ids", () => {
    expect(new Set(snapshots.map((s) => s.snapshot.id)).size).toBe(snapshots.length);
  });

  it("presets have unique ids", () => {
    for (const list of [currentData.sources, currentData.targets]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });
});
