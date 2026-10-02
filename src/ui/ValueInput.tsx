import { useState, type KeyboardEvent } from "react";
import { editableText, formatValue, parseEditable, type DisplayUnit } from "./format";

export interface ValueInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: DisplayUnit;
  onChange: (value: number) => void;
}

export const TYPED_PRECISION = 10;

export function commitValue(raw: number, min: number, max: number, step: number, unit: DisplayUnit): number {
  const clamped = Math.min(max, Math.max(min, raw));
  const grain = unit === "rating" ? step : step / TYPED_PRECISION;
  return Number((Math.round(clamped / grain) * grain).toFixed(10));
}

export function ValueInput({ label, value, min, max, step, unit, onChange }: ValueInputProps) {
  const [draft, setDraft] = useState<string | undefined>(undefined);

  const commit = () => {
    if (draft === undefined) return;
    const parsed = parseEditable(draft, unit);
    if (parsed !== undefined) onChange(commitValue(parsed, min, max, step, unit));
    setDraft(undefined);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setDraft(undefined);
      requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
      return;
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={`${label}, exact value`}
      title="Click to type a value"
      className="w-[8ch] cursor-text border-0 border-b border-dotted border-transparent bg-transparent p-0 text-right font-display text-sm font-bold tracking-wide text-accent-hot placeholder:text-ink-muted hover:border-ink-faint focus:border-accent focus:outline-none"
      value={draft ?? formatValue(value, unit)}
      placeholder={editableText(value, unit)}
      onFocus={() => setDraft("")}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
}
