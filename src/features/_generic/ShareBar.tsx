import { useEffect, useState } from "react";

const COPIED_MS = 1600;

const buttonClass =
  "cursor-pointer border-0 bg-transparent p-0 font-display text-[11px] tracking-[0.2em] uppercase transition-colors";

export function ShareBar({ canReset, onReset }: { canReset: boolean; onReset: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = () => {
    setCopied(true);
    navigator.clipboard.writeText(window.location.href).catch(() => setCopied(false));
  };

  return (
    <div className="flex items-center justify-center gap-3 text-ink-muted">
      <button
        type="button"
        onClick={copy}
        className={`${buttonClass} grid text-accent hover:text-accent-hot`}
      >
        <span className={`col-start-1 row-start-1 ${copied ? "invisible" : ""}`}>Copy link</span>
        <span className={`col-start-1 row-start-1 ${copied ? "" : "invisible"}`}>Link copied</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={onReset}
        disabled={!canReset}
        className={`${buttonClass} text-accent enabled:hover:text-accent-hot disabled:cursor-default disabled:text-ink-faint`}
      >
        Reset
      </button>
    </div>
  );
}
