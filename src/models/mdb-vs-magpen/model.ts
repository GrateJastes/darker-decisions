import { currentData, type GameData } from "@data/index";
import { damage } from "@engine/damage";
import { findCrossings, marginalGain, range, solveMonotone } from "@engine/analysis";
import {
  defineModel,
  flat,
  pct,
  type MarkerSpec,
  type ParamValues,
  type PresetGroup,
  type Statement,
} from "../types";

const STEP = 0.01;
export const SOLVE_MAX = 5;
export const Y_MAX = 1.5;
export const MPB_MIN = -0.5;
const Y_STEP = 0.25;
const GRID = 300;
const MIN_LABEL_HEIGHT = 0.25;

const DEFAULT_SOURCE = "wizard-fireball-hit";
const magicalSources = currentData.sources.filter((s) => s.school === "magical");
const defaultSource = magicalSources.find((s) => s.id === DEFAULT_SOURCE) ?? magicalSources[0]!;

const params = {
  source: {
    kind: "select",
    label: "Damage source",
    options: magicalSources.map((s) => ({ value: s.id, label: s.label })),
    default: defaultSource.id,
    hidden: true,
  },
  base: {
    kind: "number",
    label: "Base damage",
    min: 1,
    max: 100,
    step: 1,
    default: defaultSource.baseDamage,
    unit: "flat",
    group: "damage",
  },
  scaling: {
    kind: "number",
    label: "Damage scaling",
    min: 0,
    max: 1.5,
    step: 0.05,
    default: defaultSource.scaling,
    unit: "scale",
    hint: "Attribute bonus ratio, the (1.0) after the damage",
    group: "damage",
  },
  gear: {
    kind: "number",
    label: "Magical damage (weapon)",
    min: 0,
    max: 20,
    step: 1,
    default: 0,
    unit: "flat",
    hint: "Staff / spellbook / crystal ball",
    group: "damage",
  },
  wpen: {
    kind: "number",
    label: "Magic pen (weapon)",
    min: 0,
    max: 0.15,
    step: 0.05,
    default: 0,
    unit: "percent",
    hint: "Bundled with the weapon, e.g. Spellbook 5%, Crystal Ball 10%, Magic Staff 15%",
    group: "damage",
  },
  add: {
    kind: "number",
    label: "Additional magical damage",
    min: 0,
    max: 15,
    step: 1,
    default: 0,
    unit: "flat",
    group: "damage",
  },
  mpb: {
    kind: "number",
    label: "MPB",
    min: MPB_MIN,
    max: Y_MAX,
    step: 0.005,
    default: 0.3,
    unit: "percent",
    hint: "Total, as on the character sheet; can be negative",
    sticky: [0],
    group: "have",
  },
  pen: {
    kind: "number",
    label: "Magic pen (other gear)",
    min: 0,
    max: 0.5,
    step: 0.005,
    default: 0,
    unit: "percent",
    hint: "On top of the weapon's",
    group: "have",
  },
  mdr: {
    kind: "number",
    label: "Target MDR",
    min: 0,
    max: currentData.caps.damageReductionRaised,
    step: 0.005,
    default: 0.4,
    unit: "percent",
    hint: "Capped at 65%, or 75% with Iron Will",
    group: "target",
  },
} as const;

export type Params = ParamValues<typeof params>;

const sourcePresets: PresetGroup<typeof params> = {
  id: "source",
  label: "Damage source",
  before: "base",
  hint: "Spell, skill or weapon; fills in base damage and scaling",
  rememberAs: "source",
  searchable: true,
  options: magicalSources.map((s) => ({
    value: s.id,
    label: s.label,
    group: s.group,
    sets: { base: s.baseDamage, scaling: s.scaling },
  })),
};

export function hitDamage(p: Params, mpb: number, mdr: number, data: GameData): number {
  return damage(
    {
      baseDamage: p.base,
      scaling: p.scaling,
      gearDamage: p.gear,
      additionalDamage: p.add,
      powerBonus: mpb,
      penetration: p.wpen + p.pen,
    },
    { damageReduction: Math.min(mdr, data.caps.damageReductionRaised) },
    { penetrationCap: data.caps.penetration },
  );
}

export function gains(p: Params, mpb: number, mdr: number, data: GameData) {
  return {
    mpb: marginalGain((x) => hitDamage(p, x, mdr, data), mpb, STEP),
    pen: marginalGain((x) => hitDamage({ ...p, pen: x }, mpb, mdr, data), p.pen, STEP),
  };
}

const penAdvantage = (p: Params, mpb: number, mdr: number, data: GameData) => {
  const g = gains(p, mpb, mdr, data);
  return g.pen - g.mpb;
};

export function switchPoint(p: Params, mdr: number, data: GameData): number | undefined {
  if (mdr <= 0) return undefined;
  return solveMonotone((mpb) => penAdvantage(p, mpb, mdr, data), 0, MPB_MIN, SOLVE_MAX);
}

export function penFromStartAt(p: Params, data: GameData): number | undefined {
  return solveMonotone(
    (mdr) => (mdr <= 0 ? -1 : penAdvantage(p, 0, mdr, data)),
    0,
    0,
    data.caps.damageReductionRaised,
  );
}

export const mdbVsMagpen = defineModel({
  id: "mdb-vs-magpen",
  title: "When to start building magic pen",
  question: "Against a given MDR, how much MPB before magic pen becomes the better stat?",
  params,
  presets: [sourcePresets],
  groups: [
    { id: "damage", label: "Your damage", placement: "inputs" },
    { id: "target", placement: "chart" },
    { id: "have", label: "You already have", placement: "chart", columns: 2 },
  ],
  compute(p, data) {
    const cap = data.caps.damageReductionRaised;
    const at = switchPoint(p, p.mdr, data);
    const fromStart = penFromStartAt(p, data);
    const now = gains(p, p.mpb, p.mdr, data);
    const mdr = pct(p.mdr);

    const headline: Statement =
      p.mdr <= 0
        ? { template: "Against {mdr} MDR, magic pen does nothing — build MPB.", values: { mdr } }
        : at === undefined
          ? {
              template: "Against {mdr} MDR, MPB stays the better stat past {max} MPB.",
              values: { mdr, max: pct(SOLVE_MAX) },
            }
          : at <= MPB_MIN
            ? { template: "Against {mdr} MDR, magic pen is the better stat at any MPB.", values: { mdr } }
            : p.wpen + p.pen > 0
              ? {
                  template:
                    "Against {mdr} MDR, with your {pen} magic pen, more of it pays off once you reach {at} MPB.",
                  values: { mdr, pen: pct(p.wpen + p.pen), at: pct(at) },
                }
              : {
                  template: "Against {mdr} MDR, add magic pen once you reach {at} MPB.",
                  values: { mdr, at: pct(at) },
                };

    const details: Statement[] = [
      {
        template: "You're at {mpb} MPB, so your next point is better spent on {stat}.",
        values: { mpb: pct(p.mpb), stat: now.pen > now.mpb ? "magic pen" : "MPB" },
      },
    ];
    if (fromStart !== undefined && fromStart > 0) {
      details.push({
        template:
          "Against targets with {r0} MDR or more, take magic pen first — it beats MPB even before you have any MPB.",
        values: { r0: pct(fromStart) },
      });
    }

    const yMin = Math.min(0, Math.floor(p.mpb / Y_STEP) * Y_STEP);
    const yTicks = range(yMin, Y_MAX, Math.round((Y_MAX - yMin) / Y_STEP));
    const grid = range(0, cap, GRID);
    const raw = (r: number) => switchPoint(p, r, data) ?? SOLVE_MAX;
    const clipped = (r: number) => Math.min(Math.max(raw(r), yMin), Y_MAX);
    const topExit = findCrossings(grid, raw, Y_MAX)[0];
    const bottomExit = findCrossings(grid, raw, yMin)[0];
    const xs = [topExit, bottomExit, ...grid].filter((x) => x !== undefined).sort((a, b) => a - b);
    const visible = xs
      .map((x) => ({ x, y: switchPoint(p, x, data) }))
      .filter(
        (pt): pt is { x: number; y: number } =>
          pt.y !== undefined && pt.y <= Y_MAX + 1e-9 && pt.y >= yMin - 1e-9 && pt.y > MPB_MIN,
      );

    const mpbLabelX = (bottomExit ?? cap) / 2;
    const penLabelX = ((topExit ?? 0) + cap) / 2;
    const labels: MarkerSpec[] = [];
    if (clipped(mpbLabelX) - yMin >= MIN_LABEL_HEIGHT) {
      labels.push({ kind: "text", x: mpbLabelX, y: (yMin + clipped(mpbLabelX)) / 2, text: "MPB FIRST" });
    }
    if (Y_MAX - clipped(penLabelX) >= MIN_LABEL_HEIGHT) {
      labels.push({
        kind: "text",
        x: penLabelX,
        y: (clipped(penLabelX) + Y_MAX) / 2,
        text: "MAGIC PEN FIRST",
      });
    }

    return {
      verdict: { headline, details },
      charts: [
        {
          id: "switch-vs-mdr",
          title: "When magic pen overtakes MPB",
          x: {
            label: "Target MDR",
            unit: "percent",
            domain: [0, cap],
            ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
          },
          y: {
            label: "Your MPB",
            unit: "percent",
            domain: [yMin, Y_MAX],
            ticks: yTicks,
          },
          series: [{ id: "switch", label: "Switch point", points: visible, emphasis: "primary" }],
          bands: [
            {
              id: "mpb-zone",
              label: "MPB is better",
              points: grid.map((x) => ({ x, lo: yMin, hi: clipped(x) })),
            },
            {
              id: "pen-zone",
              label: "Magic pen is better",
              points: grid.map((x) => ({ x, lo: clipped(x), hi: Y_MAX })),
            },
          ],
          markers: [
            ...labels,
            { kind: "vline", x: data.caps.damageReduction, label: "65% cap" },
            ...(yMin < 0 ? [{ kind: "hline" as const, y: 0 }] : []),
            ...(p.mdr >= 0 ? [{ kind: "point" as const, x: p.mdr, y: p.mpb, label: "you" }] : []),
          ],
        },
      ],
      readouts: [
        { id: "switch", label: "Switch at", value: pct(at ?? NaN), hint: "MPB, vs this MDR" },
        { id: "damage", label: "Damage per hit", value: flat(hitDamage(p, p.mpb, p.mdr, data)) },
        { id: "mpb-gain", label: "Next 1% MPB", value: flat(now.mpb), hint: "damage added" },
        { id: "pen-gain", label: "Next 1% pen", value: flat(now.pen), hint: "damage added" },
      ],
    };
  },
});
