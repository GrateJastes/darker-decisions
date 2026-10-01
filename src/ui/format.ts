export type DisplayUnit = "percent" | "flat" | "rating" | "ratio" | "scale";

export function formatValue(value: number, unit: DisplayUnit): string {
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "—";
  switch (unit) {
    case "percent":
      return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
    case "rating":
      return Math.round(value).toString();
    case "scale":
      return value.toFixed(2).replace(/0$/, "");
    case "ratio":
      return `${value.toFixed(2)}×`;
    case "flat":
      return value.toFixed(2).replace(/\.?0+$/, "") || "0";
  }
}

export function formatTick(value: number, unit: DisplayUnit): string {
  return unit === "percent" ? `${Math.round(value * 1000) / 10}%` : formatValue(value, unit);
}
