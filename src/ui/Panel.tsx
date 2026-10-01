import type { ReactNode } from "react";

const corners = [
  "top-[-1px] left-[-1px]",
  "top-[-1px] right-[-1px] rotate-90",
  "bottom-[-1px] right-[-1px] rotate-180",
  "bottom-[-1px] left-[-1px] -rotate-90",
];

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative border border-border bg-panel p-5 ${className}`}>
      {corners.map((c) => (
        <span
          key={c}
          className={`pointer-events-none absolute h-2.5 w-2.5 border-t border-l border-accent ${c}`}
        />
      ))}
      {title && (
        <h2 className="mb-5 font-display text-xs tracking-[0.25em] text-accent uppercase">◈ {title}</h2>
      )}
      {children}
    </section>
  );
}
