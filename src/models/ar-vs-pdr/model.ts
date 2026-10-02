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

export const AR_PER_PDR = 10;
const PDR_STEP = 0.01;
const Y_MAX = 0.25;
const TOTAL_AR_MAX = 600;
const GEAR_AR_MAX = 500;
const GRID = 300;
const TIE = 1e-9;
const MIN_LABEL_HEIGHT = 0.03;

const params = {
  dm: {
    kind: "toggle",
    label: "Defense Mastery",
    default: false,
    hint: "Fighter perk; flip it to compare the same build with and without",
    group: "have",
  },
  arGear: {
    kind: "number",
    label: "Armor rating from gear stats",
    min: 0,
    max: GEAR_AR_MAX,
    step: 1,
    default: 150,
    unit: "rating",
    hint: "The armor's own stats, before Defense Mastery",
    group: "have",
  },
  arRolls: {
    kind: "number",
    label: "Armor rating from rolls",
    min: 0,
    max: 200,
    step: 1,
    default: 0,
    unit: "rating",
    hint: "Not boosted by Defense Mastery",
    group: "have",
  },
  pdr: {
    kind: "number",
    label: "PDR from rolls",
    min: 0,
    max: Y_MAX,
    step: 0.001,
    default: 0,
    unit: "percent",
    hint: "Added flat on top of the armor rating's PDR",
    group: "have",
  },
} as const;

export type Params = ParamValues<typeof params>;

export interface Mode {
  dm: boolean;
  cap: number;
  totalAr: (gear: number) => number;
}

export function mode(dm: boolean, arRolls: number, data: GameData): Mode {
  const perk = data.perks.defenseMastery;
  return dm
    ? {
        dm,
        cap: perk.maxPhysicalDamageReduction,
        totalAr: (gear) => gear * (1 + perk.itemArmorRatingBonus) + arRolls,
      }
    : { dm, cap: data.caps.damageReduction, totalAr: (gear) => gear + arRolls };
}

export const pdrFromAr = (totalAr: number, data: GameData) => evaluate(data.curves.armorRatingToPdr, totalAr);

export function totalPdr(totalAr: number, pdrRolls: number, cap: number, data: GameData): number {
  return Math.min(pdrFromAr(totalAr, data) + pdrRolls, cap);
}

export function rollGains(totalAr: number, pdrRolls: number, cap: number, data: GameData) {
  const now = totalPdr(totalAr, pdrRolls, cap, data);
  return {
    ar: totalPdr(totalAr + AR_PER_PDR, pdrRolls, cap, data) - now,
    pdr: totalPdr(totalAr, pdrRolls + PDR_STEP, cap, data) - now,
  };
}

const arRollValue = (totalAr: number, data: GameData) =>
  pdrFromAr(totalAr + AR_PER_PDR, data) - pdrFromAr(totalAr, data);

export function switchArmorRating(data: GameData): { tie: number; win: number } {
  const tie = solveMonotone((t) => PDR_STEP + TIE - arRollValue(t, data), 0, 0, TOTAL_AR_MAX)!;
  const win = solveMonotone((t) => PDR_STEP - TIE - arRollValue(t, data), 0, 0, TOTAL_AR_MAX)!;
  return { tie, win };
}

export function switchGear(m: Mode, tie: number): number {
  return solveMonotone((g) => m.totalAr(g) - tie, 0, -TOTAL_AR_MAX, TOTAL_AR_MAX)!;
}

export function nextRoll(m: Mode, gear: number, pdrRolls: number, data: GameData) {
  const total = m.totalAr(gear);
  const capped = totalPdr(total, pdrRolls, m.cap, data) >= m.cap - TIE;
  const gains = rollGains(total, pdrRolls, m.cap, data);
  const stat =
    Math.abs(gains.ar - gains.pdr) < TIE
      ? "either, they're equal here"
      : gains.ar > gains.pdr
        ? "armor rating"
        : "PDR";
  return { total, capped, gains, stat };
}

export const arVsPdr = defineModel({
  id: "ar-vs-pdr",
  title: "When to roll PDR instead of armor rating",
  question: "At what armor rating does a PDR roll beat an armor rating roll?",
  params,
  groups: [{ id: "have", label: "You already have", placement: "chart", columns: "auto" }],
  compute(p, data) {
    const current = mode(p.dm, p.arRolls, data);
    const other = mode(!p.dm, p.arRolls, data);
    const { tie } = switchArmorRating(data);
    const now = nextRoll(current, p.arGear, p.pdr, data);
    const then = nextRoll(other, p.arGear, p.pdr, data);

    const xMax = GEAR_AR_MAX;
    const xNow = switchGear(current, tie);
    const xOther = switchGear(other, tie);
    const otherName = p.dm ? "without Defense Mastery" : "with Defense Mastery";

    const perkPrefix = p.dm ? "With Defense Mastery, r" : "R";
    const headline: Statement = now.capped
      ? {
          template: "You're at the {cap} PDR cap — neither armor rating nor PDR adds anything.",
          values: { cap: pct(current.cap) },
        }
      : xNow <= 0
        ? {
            template: `${p.dm ? "With Defense Mastery and " : "With "}{rolls} rolled armor rating, you're past the switch: roll PDR.`,
            values: { rolls: rating(p.arRolls) },
          }
        : {
            template: `${perkPrefix}oll PDR instead of armor rating once your gear armor rating reaches {x}.`,
            values: { x: rating(xNow) },
          };

    const otherPrefix = p.dm ? "Without" : "With";
    const details: Statement[] = [
      now.capped
        ? { template: "Neither roll does anything until you drop below the cap.", values: {} }
        : {
            template: "You're at {total} armor rating, so your next roll is better spent on {stat}.",
            values: { total: rating(now.total), stat: now.stat },
          },
      then.capped
        ? {
            template: `${otherPrefix} Defense Mastery, the same build ({total} armor rating) is at the {cap} cap.`,
            values: { total: rating(then.total), cap: pct(other.cap) },
          }
        : {
            template: `${otherPrefix} Defense Mastery, the same build ({total} armor rating) should roll {stat}.`,
            values: { total: rating(then.total), stat: then.stat },
          },
    ];

    const grid = range(0, xMax, GRID);
    const roomFor = (m: Mode) => (x: number) =>
      Math.min(Math.max(m.cap - pdrFromAr(m.totalAr(x), data), 0), Y_MAX);
    const room = roomFor(current);
    const roomOther = roomFor(other);
    const inDomain = (x: number) => x > 0 && x < xMax;
    const xs = [...grid, ...(inDomain(xNow) ? [xNow - 1e-6, xNow] : [])].sort((a, b) => a - b);
    const arSide = (x: number) => x < xNow;
    const vertical = (x: number, top: number) => [
      { x, y: 0 },
      { x, y: top },
    ];

    const otherLegend = otherName.replace(/^./, (c) => c.toUpperCase());
    const series: SeriesSpec[] = [
      ...(inDomain(xNow)
        ? [
            {
              id: "switch",
              label: "Switch point",
              points: vertical(xNow, room(xNow)),
              emphasis: "primary" as const,
            },
          ]
        : []),
      {
        id: "cap",
        label: `${Math.round(current.cap * 100)}% PDR cap`,
        points: xs.filter((x) => room(x) < Y_MAX).map((x) => ({ x, y: room(x) })),
        emphasis: "secondary",
        legend: false,
      },
      ...(inDomain(xOther)
        ? [
            {
              id: "switch-other",
              label: `Switch ${otherName}`,
              points: vertical(xOther, roomOther(xOther)),
              emphasis: "secondary" as const,
              dashed: true,
              legend: otherLegend,
            },
          ]
        : []),
      {
        id: "cap-other",
        label: `${Math.round(other.cap * 100)}% cap ${otherName}`,
        points: grid.filter((x) => roomOther(x) < Y_MAX).map((x) => ({ x, y: roomOther(x) })),
        emphasis: "secondary",
        dashed: true,
        legend: otherLegend,
      },
    ];

    const labels: MarkerSpec[] = [];
    const clampX = (x: number) => Math.min(Math.max(x, 0), xMax);
    const arLabelX = clampX(xNow) / 2;
    const pdrLabelX = (clampX(xNow) + xMax) / 2;
    if (xNow > xMax * 0.15 && room(arLabelX) >= MIN_LABEL_HEIGHT) {
      labels.push({ kind: "text", x: arLabelX, y: room(arLabelX) / 2, text: "ARMOR RATING FIRST" });
    }
    if (xNow < xMax * 0.85 && room(pdrLabelX) >= MIN_LABEL_HEIGHT) {
      labels.push({ kind: "text", x: pdrLabelX, y: room(pdrLabelX) / 2, text: "PDR FIRST" });
    }
    const capLabelX = xMax * 0.88;
    if (Y_MAX - room(capLabelX) >= MIN_LABEL_HEIGHT) {
      labels.push({ kind: "text", x: capLabelX, y: (room(capLabelX) + Y_MAX) / 2, text: "CAPPED" });
    }

    return {
      verdict: { headline, details },
      charts: [
        {
          id: "switch-vs-ar",
          title: "When PDR overtakes armor rating",
          x: {
            label: "Armor rating from gear stats",
            unit: "rating",
            domain: [0, xMax],
            ticks: range(0, xMax, xMax / 100),
          },
          y: {
            label: "PDR from rolls",
            unit: "percent",
            domain: [0, Y_MAX],
            ticks: range(0, Y_MAX, Math.round(Y_MAX / 0.05)),
          },
          series,
          bands: [
            {
              id: "ar-zone",
              label: "Armor rating is better",
              legend: false,
              points: xs.map((x) => ({ x, lo: 0, hi: arSide(x) ? room(x) : 0 })),
            },
            {
              id: "pdr-zone",
              label: "PDR is better",
              legend: false,
              points: xs.map((x) => ({ x, lo: 0, hi: arSide(x) ? 0 : room(x) })),
            },
            {
              id: "cap-zone",
              label: "Capped",
              points: xs.map((x) => ({ x, lo: room(x), hi: Y_MAX })),
              legend: false,
            },
          ],
          markers: [...labels, { kind: "point", x: Math.min(p.arGear, xMax), y: Math.min(p.pdr, Y_MAX) }],
        },
      ],
      readouts: [
        {
          id: "total-ar",
          label: "Armor rating",
          value: rating(now.total),
          hint: p.dm ? "total, with Defense Mastery" : "total",
        },
        {
          id: "ar-pdr",
          label: "PDR from armor rating",
          value: pct(Math.min(pdrFromAr(now.total, data), current.cap)),
        },
        {
          id: "total-pdr",
          label: "Total PDR",
          value: pct(totalPdr(now.total, p.pdr, current.cap, data)),
          hint: `cap ${Math.round(current.cap * 100)}%`,
        },
        {
          id: "ar-gain",
          label: "Next 10 armor rating",
          value: pct(now.gains.ar),
          hint: "PDR added",
        },
      ],
    };
  },
});
