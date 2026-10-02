# darker-tweaks

Small stat trade-off calculators for Dark and Darker. Each one illustrates a single statement, such as "against 150 MR, magic pen beats MPB once you have ~78% MPB".

- Plan and decisions: [PLAN.md](PLAN.md)
- Code structure and layer rules: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Where the game numbers come from: [src/data/sources.md](src/data/sources.md)

## Develop

```sh
pnpm install
pnpm dev
pnpm check
```

`pnpm check` runs the typecheck, ESLint, the `dependency-cruiser` layer rules and the Vitest suite. The deploy runs it too, so a broken tree never goes live.

TypeScript is pinned to `~6.0` because `typescript-eslint` doesn't support TS 7 yet.

## Deploy

Every push to `master` deploys to https://darker-decisions.com through `.github/workflows/deploy.yml`, which runs `scripts/deploy.sh`: check, build, rsync `dist/` to the server, then confirm the live page serves the new bundle. The server's site config is `deploy/Caddyfile`.

## Adding a calculator

1. Write `src/models/<id>/model.ts` with `defineModel({ params, compute })` and give it tests. The tests should pin the verdict.
2. Write `src/features/<id>/index.tsx`, which exports a `FeatureEntry`. Start with `GenericCalculatorView`.
3. Add the entry to `src/app/registry.ts`.
