export function Readout({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="border border-border bg-bg-alt px-3 py-4 text-center">
      <div className="mb-2 font-display text-[10px] tracking-[0.25em] text-ink-dim uppercase">{label}</div>
      <div className="font-display text-2xl font-bold tracking-wide text-accent-hot">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-faint italic">{hint}</div>}
    </div>
  );
}
