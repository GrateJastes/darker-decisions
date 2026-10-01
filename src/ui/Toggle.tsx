import { Field } from "./Field";

export interface ToggleProps {
  label: string;
  value: boolean;
  hint?: string | undefined;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, value, hint, onChange }: ToggleProps) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="checkbox"
        className="accent-accent"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
    </Field>
  );
}
