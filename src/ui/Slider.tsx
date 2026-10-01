import { Field } from "./Field";
import type { DisplayUnit } from "./format";
import { ValueInput } from "./ValueInput";

const STICKY_FRACTION = 0.03;

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: DisplayUnit;
  hint?: string | undefined;
  sticky?: readonly number[] | undefined;
  onChange: (value: number) => void;
}

export function snap(value: number, sticky: readonly number[], radius: number): number {
  return sticky.find((s) => Math.abs(value - s) <= radius) ?? value;
}

export function Slider({ label, value, min, max, step, unit, hint, sticky = [], onChange }: SliderProps) {
  const notches = sticky.filter((s) => s > min && s < max);
  return (
    <Field
      label={label}
      value={
        <ValueInput
          label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          unit={unit}
          onChange={onChange}
        />
      }
      hint={hint}
    >
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(snap(Number(e.target.value), sticky, (max - min) * STICKY_FRACTION))}
          aria-label={label}
        />
        {notches.map((n) => (
          <span
            key={n}
            className="pointer-events-none absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink-faint"
            style={{ left: `calc(7px + (100% - 14px) * ${(n - min) / (max - min)})` }}
          />
        ))}
      </div>
    </Field>
  );
}
