import type { ReactNode } from "react";
import { currentData } from "@data/index";
import { Link, usePath } from "./router";

const REPO_URL = "https://github.com/GrateJastes/darker-decisions";

const snapshotDate = (() => {
  const iso = /\d{4}-\d{2}-\d{2}/.exec(currentData.snapshot.id)?.[0] ?? currentData.snapshot.retrieved;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
})();

export function Shell({ children }: { children: ReactNode }) {
  const atHome = usePath().replace(/\/$/, "") === "";
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4">
          <div className="flex">
            {!atHome && (
              <Link
                to="/"
                className="font-display text-xs tracking-[0.2em] text-ink-dim uppercase no-underline transition-colors hover:text-accent-hot"
              >
                ←<span className="hidden sm:inline">&nbsp;&nbsp;All calculators</span>
              </Link>
            )}
          </div>
          <Link to="/" className="font-display text-xs tracking-[0.4em] text-accent uppercase no-underline">
            ❖&nbsp;&nbsp;Darker Decisions&nbsp;&nbsp;❖
          </Link>
          <div />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-8">
        <main>{children}</main>
        <footer className="mt-10 flex flex-wrap justify-center gap-x-2 text-xs text-ink-muted italic">
          <span>
            Game data from the{" "}
            <a className="text-ink-muted hover:text-ink-dim" href={currentData.snapshot.source}>
              Dark and Darker Wiki
            </a>
            , {snapshotDate}
          </span>
          <span>·</span>
          <a className="text-ink-muted hover:text-ink-dim" href={REPO_URL}>
            Source on GitHub
          </a>
        </footer>
      </div>
    </>
  );
}
