import { Panel } from "@ui/Panel";
import { features } from "./registry";
import { Link } from "./router";

export function Landing() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <Link key={f.slug} to={`/${f.slug}`} className="text-inherit no-underline">
          <Panel className="h-full transition-colors hover:border-border-hot">
            <h2 className="m-0 font-display text-lg text-ink">{f.title}</h2>
            <p className="mb-0 text-ink-dim italic">{f.blurb}</p>
          </Panel>
        </Link>
      ))}
    </div>
  );
}
