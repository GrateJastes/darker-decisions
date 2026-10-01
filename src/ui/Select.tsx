import { Field } from "./Field";

export interface SelectProps {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  hint?: string | undefined;
  onChange: (value: string) => void;
}

export function Select({ label, value, options, hint, onChange }: SelectProps) {
  return (
    <Field label={label} hint={hint}>
      <select
        className="w-full border border-border bg-bg-alt px-2 py-1.5 text-ink focus:border-accent focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
