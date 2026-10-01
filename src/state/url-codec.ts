import type { ParamDef, ParamSchema, ParamValues } from "@models/types";

const TYPED_PRECISION = 10;

function decodeOne(def: ParamDef, raw: string | null): ParamDef["default"] {
  if (raw === null) return def.default;
  switch (def.kind) {
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) return def.default;
      const clamped = Math.min(def.max, Math.max(def.min, n));
      const grain = def.unit === "rating" ? def.step : def.step / TYPED_PRECISION;
      return Number((Math.round(clamped / grain) * grain).toFixed(10));
    }
    case "select":
      return def.options.some((o) => o.value === raw) ? raw : def.default;
    case "toggle":
      return raw === "1" ? true : raw === "0" ? false : def.default;
  }
}

function encodeOne(def: ParamDef, value: ParamDef["default"]): string {
  if (def.kind === "toggle") return value ? "1" : "0";
  if (def.kind === "number") return String(Number((value as number).toPrecision(10)));
  return String(value);
}

export function decode<S extends ParamSchema>(schema: S, search: string): ParamValues<S> {
  const q = new URLSearchParams(search);
  return Object.fromEntries(
    Object.entries(schema).map(([k, def]) => [k, decodeOne(def, q.get(k))]),
  ) as ParamValues<S>;
}

export function encode<S extends ParamSchema>(schema: S, values: ParamValues<S>): string {
  const q = new URLSearchParams();
  for (const [k, def] of Object.entries(schema)) {
    const v = values[k] as ParamDef["default"];
    if (def.kind === "number" && def.derive) continue;
    if (v !== def.default) q.set(k, encodeOne(def, v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
