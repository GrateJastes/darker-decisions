import type { ReactNode } from "react";
import { currentData } from "@data/index";
import { Link } from "./router";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 border-b border-border pb-5 text-center">
        <Link to="/" className="font-display text-xs tracking-[0.4em] text-accent uppercase no-underline">
          ❖&nbsp;&nbsp;Darker Tweaks&nbsp;&nbsp;❖
        </Link>
      </header>
      <main>{children}</main>
      <footer className="mt-10 text-center text-xs text-ink-faint italic">
        Game data: {currentData.snapshot.id} ·{" "}
        <a className="text-ink-faint" href={currentData.snapshot.source}>
          Dark and Darker Wiki
        </a>
      </footer>
    </div>
  );
}
