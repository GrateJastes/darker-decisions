import type { ReactNode } from "react";

export function Field({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: ReactNode;
  hint?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex min-h-6 items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">{label}</span>
        {value !== undefined &&
          (typeof value === "string" ? (
            <span className="font-display text-sm font-bold tracking-wide text-accent-hot">{value}</span>
          ) : (
            value
          ))}
      </div>
      {children}
      {hint && <div className="mt-1 text-xs text-ink-muted italic">{hint}</div>}
    </div>
  );
}
