import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const layers = ["data", "engine", "models", "state", "ui", "features", "app"] as const;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: Object.fromEntries(
      layers.map((layer) => [`@${layer}`, fileURLToPath(new URL(`./src/${layer}`, import.meta.url))]),
    ),
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
