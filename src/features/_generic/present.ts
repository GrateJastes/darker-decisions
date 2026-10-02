import type { Quantity, Statement } from "@models/types";
import { formatValue } from "@ui/format";
import type { TextWithValues } from "@ui/VerdictBanner";

export const formatQuantity = (q: Quantity): string => formatValue(q.value, q.unit);

export function presentStatement(s: Statement): TextWithValues {
  return {
    template: s.template,
    values: Object.fromEntries(
      Object.entries(s.values).map(([k, v]) => [k, typeof v === "string" ? v : formatQuantity(v)]),
    ),
    fixed: Object.entries(s.values)
      .filter(([, v]) => typeof v !== "string")
      .map(([k]) => k),
  };
}
