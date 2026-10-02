import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { pageMeta } from "./scripts/page-meta";

const layers = ["data", "engine", "models", "state", "ui", "features", "app"] as const;

const alias = Object.fromEntries(
  layers.map((layer) => [`@${layer}`, fileURLToPath(new URL(`./src/${layer}`, import.meta.url))]),
);

export default defineConfig({
  plugins: [react(), tailwindcss(), pageMeta(alias)],
  resolve: { alias },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
