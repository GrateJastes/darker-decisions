import { currentData, type GameData } from "@data/index";
import { afterAdditional } from "@engine/damage";
import { range } from "@engine/analysis";
import {
  defineModel,
  flat,
  pct,
  ratio,
  type MarkerSpec,
  type ParamValues,
  type PresetGroup,
  type Statement,
} from "../types";

export const HS_PER_PPB = 2;
const PPB_STEP = 0.01;
const GRID = 200;
const MIN_LABEL_HEIGHT = 0.04;

const sources = currentData.sources.filter((s) => s.school === "physical");
const defaultSource = sources.find((s) => s.id === "physical-weapon-longsword-rare") ?? sources[0]!;

const params = {
  source: {
    kind: "select",
    label: "Damage source",
    options: sources.map((s) => ({ value: s.id, label: s.label })),
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
  add: {
    kind: "number",
    label: "Additional physical damage",
    min: 0,
    max: 15,
    step: 1,
    default: 0,
    unit: "flat",
    group: "damage",
  },
  hsr: {
    kind: "number",
    label: "Target headshot reduction",
    min: 0,
    max: 0.3,
    step: 0.01,
    default: 0,
    unit: "percent",
    hint: "From the target's helmet, e.g. 10–29%",
    group: "target",
  },
  hsp: {
    kind: "number",
    label: "Your headshot penetration",
    min: 0,
    max: 1,
    step: 0.05,
    default: 0,
    unit: "percent",
    hint: "Cuts the target's headshot reduction; Penetrating Shot gives 50%",
    group: "target",
  },
  rate: {
    kind: "number",
    label: "Your headshot rate",
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    unit: "percent",
    hint: "Share of your hits that land on the head; the rest count as body hits",
    group: "rate",
  },
  pb: {
    kind: "number",
    label: "PPB",
    min: -0.5,
    max: 1.5,
    step: 0.005,
    default: 0.3,
    unit: "percent",
    hint: "Total, as on the character sheet; can be negative",
    sticky: [0],
    group: "have",
  },
  hsb: {
    kind: "number",
    label: "Headshot damage",
    min: 0,
    max: currentData.hitLocation.headshotBonusCap,
    step: 0.005,
    default: 0,
    unit: "percent",
    hint: "Bonus on top of the 150% headshot",
    group: "have",
  },
} as const;

export type Params = ParamValues<typeof params>;

const sourcePresets: PresetGroup<typeof params> = {
  id: "source",
  label: "Damage source",
  before: "base",
  hint: "Skill or weapon; fills in base damage and scaling",
  rememberAs: "source",
  searchable: true,
  options: sources.map((s) => ({
    value: s.id,
    label: s.label,
    group: s.group,
    sets: { base: s.baseDamage, scaling: s.scaling },
  })),
};

export const effectiveReduction = (p: Pick<Params, "hsr" | "hsp">) => p.hsr * (1 - Math.min(p.hsp, 1));

export const headMultiplier = (hsb: number, reduction: number, data: GameData) =>
  data.hitLocation.head + Math.min(hsb, data.hitLocation.headshotBonusCap) - reduction;

const bodyDamage = (p: Params, pb: number) =>
  afterAdditional({ baseDamage: p.base, scaling: p.scaling, powerBonus: pb, additionalDamage: p.add });

export function averageHit(p: Params, pb: number, hsb: number, rate: number, data: GameData): number {
  return bodyDamage(p, pb) * (1 + rate * (headMultiplier(hsb, effectiveReduction(p), data) - 1));
}

export function gains(p: Params, rate: number, data: GameData) {
  const now = averageHit(p, p.pb, p.hsb, rate, data);
  return {
    pb: averageHit(p, p.pb + PPB_STEP, p.hsb, rate, data) - now,
    hs: averageHit(p, p.pb, p.hsb + HS_PER_PPB * PPB_STEP, rate, data) - now,
  };
}

const pbWeight = (p: Params) => p.base * p.scaling;

export function switchBonus(p: Params, rate: number, data: GameData): number {
  if (rate <= 0) return -Infinity;
  const w = pbWeight(p);
  if (w <= 0) return Infinity;
  return (
    (HS_PER_PPB * bodyDamage(p, p.pb)) / w - 1 / rate - (data.hitLocation.head - 1) + effectiveReduction(p)
  );
}

export function requiredRate(p: Params, hsb: number, data: GameData): number | undefined {
  const w = pbWeight(p);
  if (w <= 0) return 0;
  const inverse =
    (HS_PER_PPB * bodyDamage(p, p.pb)) / w - (data.hitLocation.head - 1) - hsb + effectiveReduction(p);
  if (inverse <= 1) return undefined;
  return 1 / inverse;
}

export const headshotVsPpb = defineModel({
  id: "headshot-vs-ppb",
  title: "When headshot damage pays off",
  question: "How many headshots do you need to land before headshot damage beats PPB?",
  params,
  presets: [sourcePresets],
  groups: [
    { id: "damage", label: "Your damage", placement: "inputs" },
    { id: "target", label: "Target", placement: "inputs" },
    { id: "rate", placement: "chart" },
    { id: "have", label: "You already have", placement: "chart", columns: 2 },
  ],
  compute(p, data) {
    const cap = data.hitLocation.headshotBonusCap;
    const at = switchBonus(p, p.rate, data);
    const now = gains(p, p.rate, data);
    const fresh = requiredRate(p, 0, data);
    const rate = pct(p.rate);
    const capped = p.hsb >= cap;

    const headline: Statement =
      at <= 0
        ? {
            template: "Hitting {rate} headshots, roll PPB — headshot damage doesn't pay off yet.",
            values: { rate },
          }
        : at >= cap
          ? {
              template: "Hitting {rate} headshots, headshot damage beats PPB all the way to the {cap} cap.",
              values: { rate, cap: pct(cap) },
            }
          : {
              template:
                "Hitting {rate} headshots, add headshot damage up to {at} ({mult} headshots), then switch to PPB.",
              values: { rate, at: pct(at), mult: pct(headMultiplier(at, 0, data)) },
            };

    const details: Statement[] = [
      capped
        ? {
            template: "You're at the {cap} headshot damage cap, so your next roll goes to PPB.",
            values: { cap: pct(cap) },
          }
        : {
            template: "You're at {hsb} headshot damage, so your next roll is better spent on {stat}.",
            values: { hsb: pct(p.hsb), stat: now.hs > now.pb ? "headshot damage" : "PPB" },
          },
      fresh === undefined
        ? {
            template: "From 0 headshot damage, PPB stays better even at 100% headshots.",
            values: {},
          }
        : {
            template: "From 0 headshot damage, it beats PPB once you land {fresh} headshots or more.",
            values: { fresh: pct(fresh) },
          },
    ];

    const grid = range(0, 1, GRID);
    const clipped = (x: number) => Math.min(Math.max(switchBonus(p, x, data), 0), cap);
    const visible = grid
      .map((x) => ({ x, y: switchBonus(p, x, data) }))
      .filter((pt) => pt.y >= 0 && pt.y <= cap);

    const labels: MarkerSpec[] = [];
    const hsLabelX = 0.85;
    const ppbLabelX = 0.2;
    if (clipped(hsLabelX) >= MIN_LABEL_HEIGHT) {
      labels.push({ kind: "text", x: hsLabelX, y: clipped(hsLabelX) / 2, text: "HEADSHOT DMG FIRST" });
    }
    if (cap - clipped(ppbLabelX) >= MIN_LABEL_HEIGHT) {
      labels.push({ kind: "text", x: ppbLabelX, y: (clipped(ppbLabelX) + cap) / 2, text: "PPB FIRST" });
    }

    return {
      verdict: { headline, details },
      charts: [
        {
          id: "switch-vs-rate",
          title: "When headshot damage beats PPB",
          x: {
            label: "Your headshot rate",
            unit: "percent",
            domain: [0, 1],
            ticks: range(0, 1, 10),
          },
          y: {
            label: "Your headshot damage",
            unit: "percent",
            domain: [0, cap],
            ticks: range(0, cap, 6),
          },
          series: [{ id: "switch", label: "Switch point", points: visible, emphasis: "primary" }],
          bands: [
            {
              id: "hs-zone",
              label: "Headshot damage is better",
              points: grid.map((x) => ({ x, lo: 0, hi: clipped(x) })),
            },
            {
              id: "pb-zone",
              label: "PPB is better",
              points: grid.map((x) => ({ x, lo: clipped(x), hi: cap })),
            },
          ],
          markers: [...labels, { kind: "point", x: p.rate, y: p.hsb, label: "you" }],
        },
      ],
      readouts: [
        {
          id: "mult",
          label: "Headshot multiplier",
          value: ratio(headMultiplier(p.hsb, effectiveReduction(p), data)),
          hint: "vs this target",
        },
        { id: "avg", label: "Average hit", value: flat(averageHit(p, p.pb, p.hsb, p.rate, data)) },
        { id: "pb-gain", label: "Next 1% PPB", value: flat(now.pb), hint: "average damage added" },
        {
          id: "hs-gain",
          label: "Next 2% headshot dmg",
          value: flat(now.hs),
          hint: "average damage added",
        },
      ],
    };
  },
});
