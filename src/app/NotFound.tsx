import { Landing } from "./Landing";

export function NotFound({ path }: { path: string }) {
  return (
    <div className="flex flex-col gap-10">
      <section className="border-y border-border-hot py-5 text-center">
        <p className="m-0 text-xl text-ink">
          There's no calculator at <span className="font-semibold text-accent-hot">{path}</span>.
        </p>
        <p className="mt-2 mb-0 text-base text-ink-dim italic">
          It may have been renamed. Here's everything that's available.
        </p>
      </section>
      <Landing />
    </div>
  );
}
