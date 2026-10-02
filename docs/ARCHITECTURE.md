# Architecture

The goal is for the UX to be cheap to throw away and rebuild, while the math, the game data and the calculator logic stay unchanged and reusable.

## Layers

```
app ──► features ──► ui
  │        │
  │        ├──────► state
  │        │
  │        └──────► models ──► engine ──► data (types)
  │
  └─ composition root: routing, registry, layout shell
```

Dependencies only point downward. The rule is enforced in CI with `dependency-cruiser`, not left as a convention.

| Layer        | Path                   | Knows about                 | Must not know about         | Changes when…                                         |
| ------------ | ---------------------- | --------------------------- | --------------------------- | ----------------------------------------------------- |
| **data**     | `src/data/`            | game numbers, zod schemas   | anything else               | a game patch lands                                    |
| **engine**   | `src/engine/`          | data types                  | React, UI, units formatting | game mechanics are discovered or corrected            |
| **models**   | `src/models/<calc>/`   | engine, data                | React, Recharts, DOM        | the _question_ a calculator answers changes           |
| **state**    | `src/state/`           | model param schemas         | specific calculators        | the persistence approach changes (URL, local storage) |
| **ui**       | `src/ui/`              | theme tokens, generic props | game, engine, models        | the visual design changes                             |
| **features** | `src/features/<calc>/` | everything below            | other features              | the UX of one calculator changes                      |
| **app**      | `src/app/`             | features registry           | calculator internals        | navigation or the shell changes                       |

**The UX is all in `features/` and `ui/`.** Those two layers can be rewritten as often as needed. Everything from `models/` downward is plain TypeScript with unit tests, so it survives any redesign. It could also be reused somewhere else later: a CLI, prerendered OG images, or a Discord bot.

## data — patch-versioned game numbers

```
src/data/
  schema.ts          zod schemas + inferred GameData type
  snapshots/
    wiki-2026-09-27.json   curves, caps, presets
  sources.md         where each table came from, when, how verified
  index.ts           loads + validates, exports `currentData` and `byPatch`
```

- Validation happens once at load time. A malformed patch file fails tests, not the user's page.
- **Presets** are data too. That covers typical targets (naked, leather rogue, plate fighter, and so on, each with AR, MR and helmet HS reduction) and typical sources (Lightning Strike 30, Fireball …, Longsword …). Illustrative calculators depend on good presets far more than on deep configurability.
- Roll ranges aren't needed now that budgets are dropped. They can be added later as another table.

### Source of truth and verification

The source of truth is the hand-curated JSON in the repo, and every table records its source URL and date in `sources.md`. The wiki is a MediaWiki, so `scripts/verify-wiki.ts` can pull page wikitext through its `api.php`, parse the tables and print a diff against our JSON. It runs manually and in CI on a schedule, never at runtime. If a datamine repository turns out to be reliable, it becomes a second verifier using the same diff mechanism.

## engine — pure game math

```
src/engine/
  curve.ts           generic piecewise-linear curve: evaluate, derivative, inverse
  mitigation.ts      AR→PDR, MR→MDR (via curve.ts + caps), penetration application
  damage.ts          the wiki formula, split into composable stages
  analysis.ts        sweep, marginal gain, crossover finder, break-even solver, argmax
```

Planned additions, created when a calculator first needs them: `hit.ts` (hit-location multipliers, headshot bonus/reduction/pen) and `stats.ts` (typed stat ids).

- **Units:** all values are fractions internally (`0.4`, never `40`). Formatting into `%` happens only in `ui`.
- **The damage formula is staged, not monolithic.** `scaledDamage → afterAdditional → afterHitLocation → afterMitigation`. That way a calculator about mitigation doesn't have to fake weapon inputs, and each stage gets its own tests.
- **`analysis.ts` is the reusable core of every insight:**
  - `sweep(f, axis)` gives `Series`
  - `marginal(f, stat, step)` gives the gain from the next increment of a stat
  - `crossover(f, g, range)` gives the x where f overtakes g, used for "after 40% MDB, magpen wins"
  - `breakEven(p => …)` gives the threshold probability, used for "below 80% headshots, more HS damage is pointless"

  These replace per-calculator closed-form solutions. Caps and piecewise curves just work with them.

- **Tests:** the wiki's worked examples, plus property tests (monotonicity, caps respected, a DR of 0 makes pen irrelevant).

## models — one calculator = one pure module

A model is the **question**: which inputs exist, and what conclusion follows from them. It contains no layout decisions.

```ts
export interface CalculatorModel<P extends Params> {
  id: string;
  title: string;
  params: ParamSchema<P>;
  compute(params: P, data: GameData): CalculatorResult;
}

export type ParamDef =
  | {
      kind: "number";
      label: string;
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: Unit;
      hint?: string;
    }
  | { kind: "select"; label: string; options: readonly { value: string; label: string }[]; default: string }
  | { kind: "preset"; label: string; presetType: PresetType; default: string }
  | { kind: "toggle"; label: string; default: boolean };

export interface CalculatorResult {
  verdict: Verdict;
  charts: ChartSpec[];
  readouts: ReadoutSpec[];
}

export interface Verdict {
  template: string;
  values: Record<string, FormattedValue>;
}

export interface ChartSpec {
  id: string;
  x: AxisSpec;
  y: AxisSpec;
  series: SeriesSpec[];
  markers: MarkerSpec[];
}
```

- **Presets are a separate concept from params.** A model may declare `presets: PresetGroup[]`. Each group is a selector whose options _overwrite_ a set of params (for example, a spell sets `base` and `scaling`). The selected option is never stored: it's derived by matching the current values, so after a manual edit the selector shows "Custom". The URL only ever holds the real params. The generic view renders a group right before the param named in `before`.
- **The verdict is a first-class output.** It is the "statement" the site exists to illustrate. Every model must produce one, and model tests assert it (for example, the crossover value at default params).
- `ChartSpec` doesn't depend on any renderer. Moving off Recharts later means rewriting a single `ui` adapter, not every calculator.
- The "move the target knob and watch the others react" UX needs no special support. It's an ordinary param, and `compute` returns the dependent values.
- A model may declare several related variants, such as `magic` and `physical`, as presets of the same model. The decision between "several small calculators" and "one flexible one" is then made in `features`, not baked into the math.

## state — generic, schema-driven

```
src/state/
  url-codec.ts       serialize/parse params using ParamSchema (short keys, defaults omitted)
  useParams.ts       React hook: (model) → [params, setParam], synced to URL
```

The schema drives this layer, so a new calculator gets shareable URLs without extra code.

## ui — dumb, themed primitives

```
src/ui/
  theme/tokens.css   CSS variables (palette from PoC), fonts
  Slider.tsx  NumberField.tsx  Select.tsx  Toggle.tsx
  Panel.tsx   Readout.tsx      VerdictBanner.tsx
  chart/ChartView.tsx         ChartSpec → Recharts
  params/ParamControl.tsx     ParamDef → the right control
```

Nothing in `ui` imports from `engine`, `models` or `data`. `ui` declares its own structural prop types (`DisplayUnit`, `ChartViewProps`, `ControlDef`), and the model types satisfy them by shape. Mapping between the two (formatting `Quantity`s, presenting `Statement`s) happens in `features/_generic/present.ts`.

Theme tokens use Tailwind v4 `@theme static`, so every token is emitted as a CSS variable even when no utility class uses it. Charts reference tokens through `var(--color-…)`.

## features — where UX experiments live

```
src/features/<calc>/
  index.tsx          FeatureEntry: { slug, title, blurb, category, View }
  View.tsx           optional custom layout, written once the generic one isn't enough
```

- One more piece lives in `src/features/_generic/`: a `GenericCalculatorView` that renders **any** model automatically (params panel → verdict → charts → readouts). A new calculator first ships with the generic view, and a custom `View.tsx` is written only when the UX deserves one.
- A feature may only import from its own folder plus the shared layers. Two features never import each other.

## app

```
src/app/
  registry.ts        list of feature entries (the only place a calculator is "registered")
  router.tsx         ~30-line History API router (usePath, navigate, Link)
  App.tsx            registry lookup by path, landing grid otherwise
  Landing.tsx
  Shell.tsx          header/footer, data-patch badge
  main.tsx
```

## Tooling

- Vite + React + TypeScript (strict), with path aliases `@engine`, `@models`, `@ui`, and so on
- Tailwind for layout and CSS variables for theme tokens
- Vitest for unit tests (engine, models, state codec), with Playwright added later if the UX settles
- ESLint + Prettier, and `dependency-cruiser` rules for the layer arrows above
- pnpm

## Deployment

- `scripts/deploy.sh`, run by `.github/workflows/deploy.yml` on every push to `master`, checks, builds and rsyncs `dist/` to the server.
- `deploy/Caddyfile` serves it with SPA fallback and long cache headers for hashed assets.
- The site is fully static, with no runtime config, secrets or backend.
