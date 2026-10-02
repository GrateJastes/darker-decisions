import type { GameData } from "@data/index";
import { evaluate } from "@engine/curve";
import { range, solveMonotone } from "@engine/analysis";
import {
  defineModel,
  pct,
  rating,
  type MarkerSpec,
  type ParamValues,
  type SeriesSpec,
  type Statement,
} from "../types";

export const MR_PER_MDR = 10;
const MDR_STEP = 0.01;
const Y_MAX = 0.25;
const TOTAL_MR_MAX = 500;
const X_MAX = 400;
const X_STEP = 50;
const GRID = 400;
const TIE = 1e-9;
const MIN_LABEL_HEIGHT = 0.03;
const MIN_LABEL_WIDTH = 0.12;

const params = {
  iw: {
    kind: "toggle",
    label: "Iron Will",
    default: false,
    hint: "Barbarian perk: +75 MR and a 75% MDR cap; flip it to compare the same build",
    group: "have",
  },
  will: {
    kind: "number",
    label: "Will",
    min: 0,
    max: 100,
    step: 1,
    default: 30,
    unit: "rating",
    hint: "Total, as built for MPB; turned into MR with diminishing returns",
    group: "have",
  },
  mr: {
    kind: "number",
    label: "MR",
    min: -100,
    max: 400,
    step: 1,
    default: 50,
    unit: "rating",
    hint: "From gear stats and rolls, without Will or Iron Will; can be negative",
    sticky: [0],
    group: "have",
  },
  mdr: {
    kind: "number",
    label: "MDR",
    min: 0,
    max: Y_MAX,
    step: 0.001,
    default: 0,
    unit: "percent",
    hint: "From gear stats and rolls, added flat on top of the MR's MDR",
    group: "have",
  },
} as const;

export type Params = ParamValues<typeof params>;

export interface Mode {
  iw: boolean;
  cap: number;
  bonus: number;
}

export const mrFromWill = (will: number, data: GameData) => evaluate(data.curves.willToMagicResistance, will);

export function mode(iw: boolean, data: GameData): Mode {
  const perk = data.perks.ironWill;
  return iw
    ? { iw, cap: perk.maxMagicalDamageReduction, bonus: perk.magicResistance }
    : { iw, cap: data.caps.damageReduction, bonus: 0 };
}

export const totalMr = (p: Pick<Params, "will" | "mr">, m: Mode, data: GameData) =>
  p.mr + mrFromWill(p.will, data) + m.bonus;

export const mdrFromMr = (mr: number, data: GameData) => evaluate(data.curves.magicResistanceToMdr, mr);

export function totalMdr(mr: number, mdrRolls: number, cap: number, data: GameData): number {
  return Math.min(mdrFromMr(mr, data) + mdrRolls, cap);
}

export function rollGains(mr: number, mdrRolls: number, cap: number, data: GameData) {
  const now = totalMdr(mr, mdrRolls, cap, data);
  return {
    mr: totalMdr(mr + MR_PER_MDR, mdrRolls, cap, data) - now,
    mdr: totalMdr(mr, mdrRolls + MDR_STEP, cap, data) - now,
  };
}

const mrRollValue = (mr: number, data: GameData) => mdrFromMr(mr + MR_PER_MDR, data) - mdrFromMr(mr, data);

export function switchMagicResistance(data: GameData): { tie: number; win: number } {
  const tie = solveMonotone((t) => MDR_STEP + TIE - mrRollValue(t, data), 0, 0, TOTAL_MR_MAX)!;
  const win = solveMonotone((t) => MDR_STEP - TIE - mrRollValue(t, data), 0, 0, TOTAL_MR_MAX)!;
  return { tie, win };
}

export function capMr(cap: number, mdrRolls: number, data: GameData): number {
  return (
    solveMonotone((t) => mdrFromMr(t, data) + mdrRolls - cap, 0, -TOTAL_MR_MAX, TOTAL_MR_MAX) ?? Infinity
  );
}

export function nextRoll(total: number, m: Mode, mdrRolls: number, data: GameData) {
  const capped = totalMdr(total, mdrRolls, m.cap, data) >= m.cap - TIE;
  const gains = rollGains(total, mdrRolls, m.cap, data);
  const stat =
    Math.abs(gains.mr - gains.mdr) < 1e-6
      ? "either, they're equal here"
      : gains.mr > gains.mdr
        ? "MR"
        : "MDR";
  return { capped, gains, stat };
}

export const mrVsMdr = defineModel({
  id: "mr-vs-mdr",
  title: "MR or MDR",
  question: "With the Will you already have, should you roll MR or MDR, and when do you hit the cap?",
  params,
  groups: [{ id: "have", label: "You already have", placement: "chart", columns: "auto" }],
  compute(p, data) {
    const current = mode(p.iw, data);
    const other = mode(!p.iw, data);
    const fromWill = mrFromWill(p.will, data);
    const total = totalMr(p, current, data);
    const totalOther = totalMr(p, other, data);
    const { tie, win } = switchMagicResistance(data);
    const now = nextRoll(total, current, p.mdr, data);
    const then = nextRoll(totalOther, other, p.mdr, data);
    const capAt = capMr(current.cap, p.mdr, data);
    const cap = pct(current.cap);
    const prefix = p.iw ? "With Iron Will, r" : "R";

    const headline: Statement =
      tie >= capAt
        ? {
            template: `${prefix}oll MR, not MDR — MR stays better all the way to the {cap} cap at {capAt} MR.`,
            values: { cap, capAt: rating(capAt) },
          }
        : {
            template: `${prefix}oll MR, not MDR — from {tie} MR they're equal, up to the {cap} cap at {capAt} MR.`,
            values: { cap, tie: rating(tie), capAt: rating(capAt) },
          };

    const otherPrefix = p.iw ? "Without" : "With";
    const details: Statement[] = [
      now.capped
        ? {
            template:
              "You're at {total} MR ({fromWill} from Will) and the {cap} cap — neither roll adds anything.",
            values: { total: rating(total), fromWill: rating(fromWill), cap },
          }
        : {
            template:
              "You're at {total} MR ({fromWill} from Will), {left} short of the cap — your next roll is better spent on {stat}.",
            values: {
              total: rating(total),
              fromWill: rating(fromWill),
              left: rating(capAt - total),
              stat: now.stat,
            },
          },
      then.capped
        ? {
            template: `${otherPrefix} Iron Will, the same build ({total} MR) is at the {cap} cap.`,
            values: { total: rating(totalOther), cap: pct(other.cap) },
          }
        : {
            template: `${otherPrefix} Iron Will, the same build ({total} MR) should roll {stat}.`,
            values: { total: rating(totalOther), stat: then.stat },
          },
      {
        template:
          "Compared as 10 MR = 1% MDR: MR wins below {tie} MR and ties up to {win} — both caps come before MDR could win.",
        values: { tie: rating(tie), win: rating(win) },
      },
    ];

    const xMin = Math.min(0, Math.floor(total / X_STEP) * X_STEP);
    const roomFor = (m: Mode) => (x: number) => Math.min(Math.max(m.cap - mdrFromMr(x, data), 0), Y_MAX);
    const room = roomFor(current);
    const roomOther = roomFor(other);
    const inDomain = (x: number) => x > xMin && x < X_MAX;
    const xs = [...range(xMin, X_MAX, GRID), ...(inDomain(tie) ? [tie - 1e-6, tie] : [])].sort(
      (a, b) => a - b,
    );
    const mrSide = (x: number) => x < tie;

    const series: SeriesSpec[] = [
      ...(room(tie) > 0
        ? [
            {
              id: "tie",
              label: "Equal from here",
              points: [
                { x: tie, y: 0 },
                { x: tie, y: room(tie) },
              ],
              emphasis: "primary" as const,
            },
          ]
        : []),
      {
        id: "cap",
        label: `${Math.round(current.cap * 100)}% MDR cap`,
        points: xs.filter((x) => room(x) < Y_MAX).map((x) => ({ x, y: room(x) })),
        emphasis: "secondary",
      },
      {
        id: "cap-other",
        label: `${Math.round(other.cap * 100)}% cap ${p.iw ? "without" : "with"} Iron Will`,
        points: xs.filter((x) => roomOther(x) < Y_MAX).map((x) => ({ x, y: roomOther(x) })),
        emphasis: "secondary",
        dashed: true,
      },
    ];

    const labels: MarkerSpec[] = [];
    const width = X_MAX - xMin;
    const capStart = Math.min(capMr(current.cap, 0, data), X_MAX);
    const label = (from: number, to: number, text: string) => {
      const mid = (from + to) / 2;
      if (to - from >= width * MIN_LABEL_WIDTH && room(mid) >= MIN_LABEL_HEIGHT) {
        labels.push({ kind: "text", x: mid, y: room(mid) / 2, text });
      }
    };
    label(xMin, Math.min(tie, capStart), "MR FIRST");
    label(tie, capStart, "EITHER");
    const capLabelX = X_MAX - width * 0.12;
    if (Y_MAX - room(capLabelX) >= MIN_LABEL_HEIGHT) {
      labels.push({ kind: "text", x: capLabelX, y: (room(capLabelX) + Y_MAX) / 2, text: "CAPPED" });
    }

    const mdrNow = totalMdr(total, p.mdr, current.cap, data);
    return {
      verdict: { headline, details },
      charts: [
        {
          id: "mr-vs-mdr",
          title: "Where MR stops beating MDR",
          x: {
            label: "Your MR",
            unit: "rating",
            domain: [xMin, X_MAX],
            ticks: range(xMin, X_MAX, Math.round((X_MAX - xMin) / X_STEP)),
          },
          y: {
            label: "Your MDR",
            unit: "percent",
            domain: [0, Y_MAX],
            ticks: range(0, Y_MAX, Math.round(Y_MAX / 0.05)),
          },
          series,
          bands: [
            {
              id: "mr-zone",
              label: "MR is better",
              points: xs.map((x) => ({ x, lo: 0, hi: mrSide(x) ? room(x) : 0 })),
            },
            {
              id: "either-zone",
              label: "Equal",
              points: xs.map((x) => ({ x, lo: 0, hi: mrSide(x) ? 0 : room(x) })),
            },
            { id: "cap-zone", label: "Capped", points: xs.map((x) => ({ x, lo: room(x), hi: Y_MAX })) },
          ],
          markers: [
            ...labels,
            ...(xMin < 0 ? [{ kind: "vline" as const, x: 0 }] : []),
            { kind: "point", x: Math.min(total, X_MAX), y: Math.min(p.mdr, Y_MAX), label: "you" },
          ],
        },
      ],
      readouts: [
        {
          id: "total-mr",
          label: "MR",
          value: rating(total),
          hint: `total, ${Math.round(fromWill)} from Will`,
        },
        {
          id: "total-mdr",
          label: "MDR",
          value: pct(mdrNow),
          hint: `total, cap ${Math.round(current.cap * 100)}%`,
        },
        {
          id: "mr-mdr",
          label: "MDR from MR",
          value: pct(Math.min(mdrFromMr(total, data), current.cap)),
        },
        { id: "mr-gain", label: "Next 10 MR", value: pct(now.gains.mr), hint: "MDR added" },
      ],
    };
  },
});
