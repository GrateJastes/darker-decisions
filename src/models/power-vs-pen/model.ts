import { currentData, type DamageSchool, type DamageSource, type GameData, type Weapon } from "@data/index";
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
export const PB_MIN = -0.5;
const Y_STEP = 0.25;
const GRID = 300;
const MIN_LABEL_HEIGHT = 0.25;

export interface PowerVsPenConfig {
  id: string;
  title: string;
  question: string;
  school: DamageSchool;
  defaultSource: string;
  names: { pb: string; pen: string; dr: string; damage: string };
  drHint: string;
  gear?: { label: string; hint: string; max: number };
  additional: boolean;
  scaling: boolean;
  weaponPen: { max: number; step: number; hint: string };
  weaponSetsPen: boolean;
  weaponPicker: boolean;
}

const NO_WEAPON = "none";

function paramsFor(
  cfg: PowerVsPenConfig,
  sources: readonly DamageSource[],
  source: DamageSource,
  weapons: readonly Weapon[],
) {
  const pen = cfg.names.pen.replace(/^./, (c) => c.toUpperCase());
  return {
    source: {
      kind: "select",
      label: "Damage source",
      options: sources.map((s) => ({ value: s.id, label: s.label })),
      default: source.id,
      hidden: true,
    },
    weapon: {
      kind: "select",
      label: "Weapon",
      options: [
        { value: NO_WEAPON, label: "None" },
        ...weapons.map((w) => ({ value: w.id, label: w.label })),
      ],
      default: NO_WEAPON,
      hidden: true,
    },
    base: {
      kind: "number",
      label: "Base damage",
      min: 1,
      max: 100,
      step: 1,
      default: source.baseDamage,
      unit: "flat",
      group: "damage",
    },
    scaling: {
      kind: "number",
      label: "Damage scaling",
      min: 0,
      max: 1.5,
      step: 0.05,
      default: source.scaling,
      unit: "scale",
      hint: "Attribute bonus ratio, the (1.0) after the damage",
      group: "damage",
      hidden: !cfg.scaling,
    },
    gear: {
      kind: "number",
      label: cfg.gear?.label ?? "Weapon damage",
      min: 0,
      max: cfg.gear?.max ?? 0,
      step: 1,
      default: 0,
      unit: "flat",
      hint: cfg.gear?.hint ?? "",
      group: "damage",
      hidden: !cfg.gear,
    },
    wpen: {
      kind: "number",
      label: `${pen} (weapon)`,
      min: 0,
      max: cfg.weaponPen.max,
      step: cfg.weaponPen.step,
      default: cfg.weaponSetsPen ? (source.penetration ?? 0) : 0,
      unit: "percent",
      hint: cfg.weaponPen.hint,
      group: "damage",
    },
    add: {
      kind: "number",
      label: `Additional ${cfg.names.damage} damage`,
      min: 0,
      max: 15,
      step: 1,
      default: 0,
      unit: "flat",
      group: "damage",
      hidden: !cfg.additional,
    },
    pb: {
      kind: "number",
      label: cfg.names.pb,
      min: PB_MIN,
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
      label: `${pen} (other gear)`,
      min: 0,
      max: 0.5,
      step: 0.005,
      default: 0,
      unit: "percent",
      hint: "On top of the weapon's",
      group: "have",
    },
    dr: {
      kind: "number",
      label: `Target ${cfg.names.dr}`,
      min: 0,
      max: currentData.caps.damageReductionRaised,
      step: 0.005,
      default: 0.4,
      unit: "percent",
      hint: cfg.drHint,
      group: "target",
    },
  } as const;
}

export type Params = ParamValues<ReturnType<typeof paramsFor>>;

export function hitDamage(p: Params, pb: number, dr: number, data: GameData): number {
  return damage(
    {
      baseDamage: p.base,
      scaling: p.scaling,
      gearDamage: p.gear,
      additionalDamage: p.add,
      powerBonus: pb,
      penetration: p.wpen + p.pen,
    },
    { damageReduction: Math.min(dr, data.caps.damageReductionRaised) },
    { penetrationCap: data.caps.penetration },
  );
}

export function gains(p: Params, pb: number, dr: number, data: GameData) {
  return {
    pb: marginalGain((x) => hitDamage(p, x, dr, data), pb, STEP),
    pen: marginalGain((x) => hitDamage({ ...p, pen: x }, pb, dr, data), p.pen, STEP),
  };
}

const penAdvantage = (p: Params, pb: number, dr: number, data: GameData) => {
  const g = gains(p, pb, dr, data);
  return g.pen - g.pb;
};

export function switchPoint(p: Params, dr: number, data: GameData): number | undefined {
  if (dr <= 0) return undefined;
  return solveMonotone((pb) => penAdvantage(p, pb, dr, data), 0, PB_MIN, SOLVE_MAX);
}

export function penFromStartAt(p: Params, data: GameData): number | undefined {
  return solveMonotone(
    (dr) => (dr <= 0 ? -1 : penAdvantage({ ...p, pen: 0 }, 0, dr, data)),
    0,
    0,
    data.caps.damageReductionRaised,
  );
}

export function powerVsPen(cfg: PowerVsPenConfig) {
  const sources = currentData.sources.filter(
    (s) => s.school === cfg.school && (cfg.scaling || s.scaling === 1),
  );
  const source = sources.find((s) => s.id === cfg.defaultSource) ?? sources[0]!;
  const weapons = currentData.weapons.filter((w) => w.school === cfg.school);
  const params = paramsFor(cfg, sources, source, weapons);
  const { pb: PB, pen: PEN, dr: DR } = cfg.names;
  const PEN_TITLE = PEN.replace(/^./, (c) => c.toUpperCase());

  const sourcePresets: PresetGroup<typeof params> = {
    id: "source",
    label: "Damage source",
    before: "base",
    hint: [
      cfg.weaponSetsPen ? "Skill or weapon" : "Spell, skill or weapon",
      cfg.scaling ? "; fills in base damage and scaling" : "; fills in base damage",
      cfg.weaponSetsPen ? ", weapons also their armor pen" : "",
    ].join(""),
    rememberAs: "source",
    searchable: true,
    options: sources.map((s) => ({
      value: s.id,
      label: s.label,
      group: s.group,
      sets:
        cfg.weaponSetsPen && s.kind === "weapon"
          ? { base: s.baseDamage, scaling: s.scaling, wpen: s.penetration ?? 0 }
          : { base: s.baseDamage, scaling: s.scaling },
    })),
  };

  const weaponPresets: PresetGroup<typeof params> = {
    id: "weapon",
    label: "Weapon",
    before: "gear",
    hint: `Fills in the weapon's ${cfg.names.damage} damage and ${PEN}`,
    rememberAs: "weapon",
    searchable: true,
    options: [
      { value: NO_WEAPON, label: "None", sets: { gear: 0, wpen: 0 } },
      ...weapons.map((w) => ({
        value: w.id,
        label: w.label,
        group: w.group,
        sets: { gear: w.gearDamage, wpen: w.penetration },
      })),
    ],
  };

  return defineModel({
    id: cfg.id,
    title: cfg.title,
    question: cfg.question,
    params,
    presets: cfg.weaponPicker ? [sourcePresets, weaponPresets] : [sourcePresets],
    groups: [
      { id: "damage", label: "Your damage", placement: "inputs" },
      { id: "target", placement: "chart" },
      { id: "have", label: "You already have", placement: "chart", columns: 2 },
    ],
    compute(p, data) {
      const cap = data.caps.damageReductionRaised;
      const at = switchPoint(p, p.dr, data);
      const fromStart = penFromStartAt(p, data);
      const now = gains(p, p.pb, p.dr, data);
      const dr = pct(p.dr);

      const headline: Statement =
        p.dr <= 0
          ? { template: `Against {dr} ${DR}, ${PEN} does nothing — build ${PB}.`, values: { dr } }
          : at === undefined
            ? {
                template: `Against {dr} ${DR}, ${PB} stays the better stat past {max} ${PB}.`,
                values: { dr, max: pct(SOLVE_MAX) },
              }
            : at <= PB_MIN
              ? { template: `Against {dr} ${DR}, ${PEN} is the better stat at any ${PB}.`, values: { dr } }
              : p.wpen + p.pen > 0
                ? {
                    template: `Against {dr} ${DR}, with your {pen} ${PEN}, more of it pays off once you reach {at} ${PB}.`,
                    values: { dr, pen: pct(p.wpen + p.pen), at: pct(at) },
                  }
                : {
                    template: `Against {dr} ${DR}, add ${PEN} once you reach {at} ${PB}.`,
                    values: { dr, at: pct(at) },
                  };

      const details: Statement[] = [
        {
          template: `You're at {pb} ${PB}, so your next point is better spent on {stat}.`,
          values: { pb: pct(p.pb), stat: now.pen > now.pb ? PEN : PB },
        },
      ];
      const fresh =
        p.wpen > 0 ? `From 0 ${PB} and only your weapon's {wpen} ${PEN}` : `From 0 ${PB} and 0 ${PEN}`;
      details.push(
        fromStart === undefined
          ? {
              template: `${fresh}, start with ${PB} against any ${DR} up to {cap}.`,
              values: { wpen: pct(p.wpen), cap: pct(cap) },
            }
          : {
              template: `${fresh}, invest in ${PEN} straight away against targets with {r0} ${DR} or more.`,
              values: { wpen: pct(p.wpen), r0: pct(fromStart) },
            },
      );

      const yMin = Math.min(0, Math.floor(p.pb / Y_STEP) * Y_STEP);
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
            pt.y !== undefined && pt.y <= Y_MAX + 1e-9 && pt.y >= yMin - 1e-9 && pt.y > PB_MIN,
        );

      const pbLabelX = (bottomExit ?? cap) / 2;
      const penLabelX = ((topExit ?? 0) + cap) / 2;
      const labels: MarkerSpec[] = [];
      if (clipped(pbLabelX) - yMin >= MIN_LABEL_HEIGHT) {
        labels.push({ kind: "text", x: pbLabelX, y: (yMin + clipped(pbLabelX)) / 2, text: `${PB} FIRST` });
      }
      if (Y_MAX - clipped(penLabelX) >= MIN_LABEL_HEIGHT) {
        labels.push({
          kind: "text",
          x: penLabelX,
          y: (clipped(penLabelX) + Y_MAX) / 2,
          text: `${PEN.toUpperCase()} FIRST`,
        });
      }

      return {
        verdict: { headline, details },
        charts: [
          {
            id: `switch-vs-${DR.toLowerCase()}`,
            title: `When ${PEN} overtakes ${PB}`,
            x: {
              label: `Target ${DR}`,
              unit: "percent",
              domain: [0, cap],
              ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
            },
            y: {
              label: `Your ${PB}`,
              unit: "percent",
              domain: [yMin, Y_MAX],
              ticks: yTicks,
            },
            series: [{ id: "switch", label: "Switch point", points: visible, emphasis: "primary" }],
            bands: [
              {
                id: "pb-zone",
                label: `${PB} is better`,
                points: grid.map((x) => ({ x, lo: yMin, hi: clipped(x) })),
              },
              {
                id: "pen-zone",
                label: `${PEN_TITLE} is better`,
                points: grid.map((x) => ({ x, lo: clipped(x), hi: Y_MAX })),
              },
            ],
            markers: [
              ...labels,
              { kind: "vline", x: data.caps.damageReduction, label: "65% cap" },
              ...(yMin < 0 ? [{ kind: "hline" as const, y: 0 }] : []),
              ...(p.dr >= 0 ? [{ kind: "point" as const, x: p.dr, y: p.pb, label: "you" }] : []),
            ],
          },
        ],
        readouts: [
          { id: "switch", label: "Switch at", value: pct(at ?? NaN), hint: `${PB}, vs this ${DR}` },
          { id: "damage", label: "Damage per hit", value: flat(hitDamage(p, p.pb, p.dr, data)) },
          { id: "pb-gain", label: `Next 1% ${PB}`, value: flat(now.pb), hint: "damage added" },
          { id: "pen-gain", label: "Next 1% pen", value: flat(now.pen), hint: "damage added" },
        ],
      };
    },
  });
}
