/// <reference types="node" />
import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}", "config/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist", ".vite", "out"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules",
        "dist",
        ".vite",
        "out",
        "**/*.config.{js,ts}",
        "**/types.ts",
        "src/preload.ts",
        "src/main.ts",
        "src/renderer/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
