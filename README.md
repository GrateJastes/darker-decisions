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

`pnpm check` runs the typecheck, ESLint, the `dependency-cruiser` layer rules and the Vitest suite. The Docker build runs it too, so a broken tree never produces an image.

TypeScript is pinned to `~6.0` because `typescript-eslint` doesn't support TS 7 yet.

## Deploy

```sh
docker compose up -d --build
```

The site is served on `127.0.0.1:${PORT:-8080}`. It's meant to sit behind the host's reverse proxy, which handles TLS. nginx falls back to `index.html` for client-side routes, and hashed assets under `/assets/` are cached as immutable.

## Adding a calculator

1. Write `src/models/<id>/model.ts` with `defineModel({ params, compute })` and give it tests. The tests should pin the verdict.
2. Write `src/features/<id>/index.tsx`, which exports a `FeatureEntry`. Start with `GenericCalculatorView`.
3. Add the entry to `src/app/registry.ts`.
