import { Panel } from "@ui/Panel";
import { categories, features } from "./registry";
import { Link } from "./router";

export function Landing() {
  return (
    <div className="flex flex-col gap-10">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="m-0 font-display text-2xl font-bold tracking-wider text-ink sm:text-3xl">
          When to switch stats
        </h1>
        <p className="mt-3 mb-0 text-lg text-ink-dim">
          Experienced players know roughly when to stop stacking one stat and start on another. Each
          calculator here turns that feel into one exact switch point for your build.
        </p>
        <p className="mt-3 mb-0 text-base text-ink-muted italic">
          The line on top is the verdict. The chart is a decision map: the dot is you, and the shaded side
          says which stat to take next. Your inputs live in the URL, so a link shares your exact setup.
        </p>
      </section>

      {categories.map((category) => (
        <section key={category.id}>
          <header className="mb-4 border-b border-border pb-2">
            <h2 className="m-0 font-display text-sm tracking-[0.25em] text-accent uppercase">
              ◈ {category.title}
            </h2>
            <p className="mt-1 mb-0 text-sm text-ink-dim italic">{category.blurb}</p>
          </header>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features
              .filter((f) => f.category === category.id)
              .map((f) => (
                <Link key={f.slug} to={`/${f.slug}`} className="text-inherit no-underline">
                  <Panel className="h-full transition-colors hover:border-border-hot">
                    <h3 className="m-0 font-display text-lg text-ink">{f.title}</h3>
                    <p className="mb-0 text-ink-dim italic">{f.blurb}</p>
                  </Panel>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
