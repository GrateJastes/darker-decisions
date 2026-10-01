import { Field } from "./Field";

export interface ToggleProps {
  label: string;
  value: boolean;
  hint?: string | undefined;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, value, hint, onChange }: ToggleProps) {
  return (
    <Field
      label={label}
      hint={hint}
      value={
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={label}
          onClick={() => onChange(!value)}
          className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors ${
            value ? "border-accent bg-accent/25" : "border-border-hot bg-bg-alt"
          }`}
        >
          <span
            className={`absolute top-1/2 left-0.5 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${
              value ? "translate-x-4 bg-accent-hot shadow-[0_0_8px_var(--color-accent)]" : "bg-ink-faint"
            }`}
          />
        </button>
      }
    />
  );
}
