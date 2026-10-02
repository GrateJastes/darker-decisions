import type { GameData } from "@data/index";

export type Unit = "percent" | "flat" | "rating" | "ratio" | "scale";

export interface Quantity {
  value: number;
  unit: Unit;
}

export type RawValues = Readonly<Record<string, number | string | boolean>>;

interface ParamCommon {
  group?: string;
  hidden?: boolean;
  when?: (values: RawValues) => boolean;
}

export interface NumberParam extends ParamCommon {
  kind: "number";
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: Unit;
  hint?: string;
  range?: (values: RawValues, data: GameData) => readonly [number, number];
  sticky?: readonly number[];
  derive?: {
    get: (values: RawValues) => number;
    set: (value: number, values: RawValues) => Record<string, number>;
  };
}

export interface SelectParam extends ParamCommon {
  kind: "select";
  label: string;
  options: readonly { value: string; label: string }[];
  default: string;
  hint?: string;
}

export interface ToggleParam extends ParamCommon {
  kind: "toggle";
  label: string;
  default: boolean;
  hint?: string;
}

export type ParamDef = NumberParam | SelectParam | ToggleParam;

export type ParamSchema = Record<string, ParamDef>;

export type ParamValue<D extends ParamDef> = D extends NumberParam
  ? number
  : D extends SelectParam
    ? string
    : boolean;

export type ParamValues<S extends ParamSchema> = { [K in keyof S]: ParamValue<S[K]> };

export interface Statement {
  template: string;
  values: Record<string, Quantity | string>;
}

export interface Verdict {
  headline: Statement;
  details: Statement[];
}

export interface ReadoutSpec {
  id: string;
  label: string;
  value: Quantity;
  hint?: string;
}

export interface AxisSpec {
  label: string;
  unit: Unit;
  domain?: readonly [number, number];
  ticks?: readonly number[];
}

export interface SeriesSpec {
  id: string;
  label: string;
  points: readonly { x: number; y: number }[];
  emphasis: "primary" | "secondary";
  dashed?: boolean;
  legend?: string | false;
}

export interface BandSpec {
  id: string;
  label: string;
  points: readonly { x: number; lo: number; hi: number }[];
  legend?: string | false;
}

export type MarkerSpec =
  | { kind: "hline"; y: number; label?: string }
  | { kind: "vline"; x: number; label?: string }
  | { kind: "point"; x: number; y: number; label?: string }
  | { kind: "xband"; x1: number; x2: number; label?: string }
  | { kind: "text"; x: number; y: number; text: string };

export interface ChartSpec {
  id: string;
  title: string;
  x: AxisSpec;
  y: AxisSpec;
  series: SeriesSpec[];
  bands?: BandSpec[];
  markers: MarkerSpec[];
}

export interface CalculatorResult {
  verdict: Verdict;
  charts: ChartSpec[];
  readouts: ReadoutSpec[];
}

export interface PresetOption<S extends ParamSchema> {
  value: string;
  label: string;
  group?: string;
  sets: Partial<ParamValues<S>>;
}

export interface PresetGroup<S extends ParamSchema> {
  id: string;
  label: string;
  before: keyof S & string;
  options: readonly PresetOption<S>[];
  hint?: string;
  rememberAs?: keyof S & string;
  searchable?: boolean;
}

export interface ParamGroup {
  id: string;
  label?: string;
  placement: "inputs" | "chart";
  columns?: number | "auto";
}

export interface CalculatorModel<S extends ParamSchema = ParamSchema> {
  id: string;
  title: string;
  question: string;
  params: S;
  presets?: readonly PresetGroup<S>[];
  groups?: readonly ParamGroup[];
  compute(params: ParamValues<S>, data: GameData): CalculatorResult;
}

const matches = <S extends ParamSchema>(o: PresetOption<S>, values: ParamValues<S>) =>
  Object.entries(o.sets).every(([k, v]) => values[k] === v);

export function activePreset<S extends ParamSchema>(
  group: PresetGroup<S>,
  values: ParamValues<S>,
): string | undefined {
  const remembered = group.rememberAs
    ? group.options.find((o) => o.value === values[group.rememberAs!])
    : undefined;
  if (remembered && matches(remembered, values)) return remembered.value;
  return group.options.find((o) => matches(o, values))?.value;
}

export function paramPatch<S extends ParamSchema>(
  schema: S,
  key: keyof S & string,
  value: ParamValues<S>[keyof S],
  values: ParamValues<S>,
): Partial<ParamValues<S>> {
  const def = schema[key]!;
  if (def.kind === "number" && def.derive) {
    return def.derive.set(value as number, values as RawValues) as Partial<ParamValues<S>>;
  }
  return { [key]: value } as Partial<ParamValues<S>>;
}

export function presetPatch<S extends ParamSchema>(
  group: PresetGroup<S>,
  option: PresetOption<S>,
): Partial<ParamValues<S>> {
  return group.rememberAs ? { ...option.sets, [group.rememberAs]: option.value } : option.sets;
}

export type LayoutItem<S extends ParamSchema> =
  { kind: "param"; key: keyof S & string } | { kind: "preset"; preset: PresetGroup<S> };

export interface LayoutSection<S extends ParamSchema> {
  id: string;
  label?: string;
  placement: ParamGroup["placement"];
  columns?: number | "auto";
  items: LayoutItem<S>[];
}

export function isVisible<S extends ParamSchema>(
  model: CalculatorModel<S>,
  item: LayoutItem<S>,
  values: ParamValues<S>,
) {
  return item.kind === "preset" || (model.params[item.key]?.when?.(values as RawValues) ?? true);
}

export function layout<S extends ParamSchema>(model: CalculatorModel<S>): LayoutSection<S>[] {
  const declared = model.groups ?? [];
  const sections: LayoutSection<S>[] = [
    ...declared.map((g) => ({ ...g, items: [] as LayoutItem<S>[] })),
    { id: "", placement: "inputs", items: [] },
  ];
  for (const [key, def] of Object.entries(model.params)) {
    if (def.hidden) continue;
    const section = sections.find((s) => s.id === (def.group ?? "")) ?? sections[sections.length - 1]!;
    for (const preset of model.presets ?? []) {
      if (preset.before === key) section.items.push({ kind: "preset", preset });
    }
    section.items.push({ kind: "param", key });
  }
  return sections.filter((s) => s.items.length > 0);
}

export function defineModel<S extends ParamSchema>(model: CalculatorModel<S>): CalculatorModel<S> {
  return model;
}

export interface ResolvedParams<S extends ParamSchema> {
  values: ParamValues<S>;
  bounds: Partial<Record<keyof S, readonly [number, number]>>;
}

export function resolveParams<S extends ParamSchema>(
  schema: S,
  values: ParamValues<S>,
  data: GameData,
): ResolvedParams<S> {
  const resolved: Record<string, unknown> = { ...values };
  for (const [key, def] of Object.entries(schema)) {
    if (def.kind === "number" && def.derive) resolved[key] = def.derive.get(values as RawValues);
  }
  const bounds: Record<string, readonly [number, number]> = {};
  for (const [key, def] of Object.entries(schema)) {
    if (def.kind !== "number" || !def.range) continue;
    const [lo, hi] = def.range(resolved as RawValues, data);
    bounds[key] = [lo, hi];
    resolved[key] = Math.min(hi, Math.max(lo, resolved[key] as number));
  }
  return { values: resolved as ParamValues<S>, bounds: bounds as ResolvedParams<S>["bounds"] };
}

export function defaults<S extends ParamSchema>(schema: S): ParamValues<S> {
  return Object.fromEntries(Object.entries(schema).map(([k, d]) => [k, d.default])) as ParamValues<S>;
}

export const pct = (value: number): Quantity => ({ value, unit: "percent" });
export const flat = (value: number): Quantity => ({ value, unit: "flat" });
export const rating = (value: number): Quantity => ({ value, unit: "rating" });
export const ratio = (value: number): Quantity => ({ value, unit: "ratio" });
