# darker-tweaks — plan

A set of small **stat-tradeoff optimizers** for Dark and Darker. Each one answers a single question with sliders, a curve, and a readout. It shows _when_ one stat stops being worth it and another takes over.

## Landscape (checked 2026-09-30)

| Tool                                                                                                                                    | What it does                                                                         | Overlap                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [MetaBot Build Calculator](https://metabot.gg/en/darkanddarker/builds)                                                                  | Gear planner: equip items, see aggregated AR/MR/damage, training dummy, share builds | Computes stats _for a given build_. No tradeoff and optimization curves.    |
| [DnDUtil](https://github.com/DustinRepo/DnDUtil) / [web](https://dustinrepo.github.io/DnDUtilWeb/)                                      | Physical/magic/health/beast-form damage calculators                                  | Point calculator: type inputs, get one number. No "which stat next" answer. |
| [Spells & Guns wiki](https://darkanddarker.wiki.spellsandguns.com/Damage) ([Stats](https://darkanddarker.wiki.spellsandguns.com/Stats)) | Formulas, AR→PDR / MR→MDR curves, hit-location multipliers                           | The data source. Formulas only, no interactivity.                           |

**The gap:** existing tools are forward calculators (build → number) and don't do inverse or marginal analysis. None of them answer "given my situation, how do I split my next rolls" or "at what point does X overtake Y".

## Product shape

- A static site with no backend. The landing page is a grid of calculator cards, and each calculator has its own route.
- Every calculator uses the same layout (taken from the PoC): an **inputs panel**, a **main chart** (a sweep over one axis with the optimum or crossover marked), and a **readout row**, plus a collapsible **"how it's computed"** section that shows the formula and the data's patch version.
- The whole state lives in the URL query string, so any configuration can be shared as a link.
- Visual identity comes from the PoC: parchment and ember palette, Cinzel and Cormorant Garamond fonts, corner ornaments.

## Calculators (initial set)

1. **Armor Rating vs PDR%** (plus its twin, **Magic Resist vs MDR%**)
   - Inputs: current AR, the PDR% you already have from other sources, and a _target PDR_ slider.
   - Output: the cheapest mix of AR rolls and PDR% rolls that reaches the target, and the AR at which one PDR% roll starts giving more than one AR roll. The piecewise curve's marginal return drops at each breakpoint, and that drop is where the crossover sits.
   - Chart: marginal PDR per roll for AR vs PDR%, over current AR. The crossover is marked, and the 65% cap is shaded.
2. **Penetration vs Power Bonus vs Additional Damage**, for magic and physical (this generalizes the PoC)
   - Inputs: base damage (spell or weapon), gear weapon/magic damage, current PB / pen / add, and the target's DR.
   - Output: optimal split of N rolls, or of a stat budget, plus the ratio curve over target DR. The PoC's current chart becomes a special case of this one.
3. **Headshot bonus vs PDB**
   - Inputs: weapon base, current PDB / HS bonus, the target's helmet headshot reduction and PDR.
   - Output: the break-even headshot rate p* above which a headshot-bonus roll beats a PDB roll. Chart: marginal expected damage per roll vs headshot rate.

Later candidates: Vigor/Max HP% vs PDR (effective HP), action speed breakpoints, move-speed breakpoints, and "two items side by side → which is better against target X".

## Decisions (2026-10-01)

- **There is no "budget" abstraction.** Roll values depend on the gear slot, and crafted items with fixed bonus rolls and perks make any cost model misleading. Calculators illustrate **statements** instead, for example "below 80% headshots, more than 170% HS damage is wasted" or "after 40% MDB, magpen beats MDB against most targets". The user moves a driving knob and sees the dependent values and the crossover or break-even point.
- **Prefer several small, specific, illustrative calculators over one configurable mega-tool.** Presets (typical targets and spells/weapons) do the work that configurability would otherwise do.
- **Stack:** Vite + React + TS + Recharts + Tailwind, as proposed.
- **Hosting:** the static build served by Caddy, deployed from CI on every push to `master`.
- **Ship one calculator first.** Each calculator gets its own detailed pass on mechanics and UX when we get to it.
- **Data source of truth:** hand-curated, patch-versioned JSON, plus a verifier script that diffs it against the wiki's MediaWiki API (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
- **First calculator:** MDB vs magpen (2026-10-01). Built on the generic view; its mechanics and UX get the detailed pass next.

Code structure: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Phases

0. **Scaffold.** Set up Vite/TS/Tailwind/Vitest/ESLint/dependency-cruiser, the `ui` primitives and theme from the PoC, the generic calculator view, URL state, and an empty registry.
1. **Engine + data.** Implement the curves, staged damage formula, analysis helpers and the first patch JSON, with tests.
2. **First calculator.** Model, then the generic view, then a custom view if it's warranted.
3. Further calculators, one at a time.

## Known unknowns / to verify

- The full AR→PDR and MR→MDR piecewise tables. The wiki has them, but they need to be transcribed carefully and checked against in-game values.
- The head hit-location multiplier (the wiki summary is ambiguous about 1.5× vs +150%), how the Headshot Damage Bonus stat stacks with it, and how helmet headshot reduction applies.
- Per-rarity roll ranges for AR, PDR%, PB, pen, additional damage and HS bonus. These are needed for the "rolls" budget unit.
- Whether "PDR% from rolls" adds to the curve output before or after the 65% cap.
