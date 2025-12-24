/// <reference types="node" />
import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,tsx}", "config/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist", ".vite", "out"],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // Auto-cleanup to prevent test isolation issues
    unstubGlobals: true,
    clearMocks: true,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // Single fork prevents orphaned worker processes
      },
    },
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
