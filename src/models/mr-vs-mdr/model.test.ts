import { describe, expect, it } from "vitest";
import { currentData } from "@data/index";
import { defaults } from "../types";
import {
  capMr,
  mdrFromMr,
  mode,
  mrFromWill,
  mrVsMdr,
  nextRoll,
  rollGains,
  switchMagicResistance,
  totalMdr,
  totalMr,
} from "./model";

const data = currentData;
const p = defaults(mrVsMdr.params);

describe("mr-vs-mdr", () => {
  it("10 MR stops beating 1% MDR at 340 MR and loses from 420 (wiki curve: 0.10%/MR at 340-430)", () => {
    const { tie, win } = switchMagicResistance(data);
    expect(tie).toBeCloseTo(340, 3);
    expect(win).toBeCloseTo(420, 3);
  });

  it("MR rolls win below 340 MR", () => {
    const g = rollGains(200, 0, 0.75, data);
    expect(g.mr).toBeGreaterThan(g.mdr);
  });

  it("both caps arrive before MDR could ever win", () => {
    const { win } = switchMagicResistance(data);
    for (const iw of [false, true]) expect(capMr(mode(iw, data).cap, 0, data)).toBeLessThan(win);
  });

  it("Iron Will adds 75 MR and raises the cap to 75%", () => {
    const build = { will: 30, mr: 100 };
    expect(totalMr(build, mode(true, data), data) - totalMr(build, mode(false, data), data)).toBe(75);
    expect([mode(false, data).cap, mode(true, data).cap]).toEqual([0.65, 0.75]);
  });

  it("turns Will into MR with diminishing returns", () => {
    expect(mrFromWill(15, data)).toBe(30);
    expect(mrFromWill(33, data) - mrFromWill(15, data)).toBe(72);
    expect(mrFromWill(58, data) - mrFromWill(48, data)).toBe(20);
  });

  it("adds MDR flat before the cap", () => {
    expect(totalMdr(200, 0.05, 0.65, data)).toBeCloseTo(mdrFromMr(200, data) + 0.05, 12);
    expect(totalMdr(500, 0.05, 0.65, data)).toBe(0.65);
  });

  it("calls MR and MDR equal in the tie zone", () => {
    expect(nextRoll(350, mode(true, data), 0, data).stat).toBe("either, they're equal here");
  });

  it("without Iron Will, MR wins all the way to the cap", () => {
    expect(mrVsMdr.compute({ ...p, iw: false }, data).verdict.headline.template).toContain(
      "MR stays better all the way to the {cap} cap",
    );
  });

  it("with Iron Will, MDR only catches up before the cap", () => {
    expect(mrVsMdr.compute({ ...p, iw: true }, data).verdict.headline.template).toContain(
      "from {tie} MR they're equal",
    );
  });

  it("puts you on the chart at your total MR", () => {
    const r = mrVsMdr.compute({ ...p, will: 30, mr: 50, iw: true }, data);
    const you = r.charts[0]!.markers!.find((m) => m.kind === "point") as { x: number };
    expect(you.x).toBeCloseTo(50 + mrFromWill(30, data) + 75, 9);
  });

  it("keeps the same number of verdict lines in every state", () => {
    const states = [p, { ...p, iw: true }, { ...p, mr: 400 }, { ...p, will: 100, iw: true, mr: 400 }];
    for (const q of states) expect(mrVsMdr.compute(q, data).verdict.details).toHaveLength(3);
  });
});
