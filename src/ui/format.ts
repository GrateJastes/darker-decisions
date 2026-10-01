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

export function editableText(value: number, unit: DisplayUnit): string {
  const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));
  switch (unit) {
    case "percent":
      return trim(value * 100, 2);
    case "rating":
      return String(Math.round(value));
    default:
      return trim(value, 3);
  }
}

export function parseEditable(text: string, unit: DisplayUnit): number | undefined {
  const cleaned = text
    .trim()
    .replace(",", ".")
    .replace(/[%×\s]/g, "")
    .replace(/^\+/, "");
  if (cleaned === "" || cleaned === "-") return undefined;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return unit === "percent" ? n / 100 : n;
}
