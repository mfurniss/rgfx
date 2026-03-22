# RGFX Hub

> **Keep this file updated!** After making changes in this folder, update this CLAUDE.md to reflect the current state.

Electron desktop app that bridges MAME game events to ESP32 LED drivers. Written in TypeScript with React and Material UI.

## Structure

- `src/` — Main process modules (IPC handlers, services, networking, drivers) and renderer (React UI). See `src/CLAUDE.md` for details.
- `assets/` — Bundled static assets (firmware binaries, interceptors, transformers, LED hardware definitions). See `assets/CLAUDE.md`. **Do NOT edit interceptors/transformers here — edit in `~/.rgfx/` instead.**
- `config/` — Build and app configuration
- `scripts/` — Dev tooling (build scripts, icon generation)

## Key Commands

- `npm run test` — Run tests (`vitest run`, parallel forks)
- `npm run test:watch` — Watch mode
- `npm run test:coverage` — Coverage report (v8 provider)
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript type checking
- `npm run check` — All three (typecheck + lint + test)
- `npm start` — Dev mode with hot reload
- `npm run build` — Production build

## Path Handling

All path operations use `pathe` instead of `node:path` for cross-platform compatibility (normalizes to forward slashes on all platforms). ESLint `no-restricted-imports` bans `node:path` and `path`.

## Test Configuration

Tests use vitest with jsdom environment and parallel forks (`pool: "forks"`). Global setup in `src/__tests__/setup.ts` provides electron/electron-log mocks, jsdom compatibility shims, and automatic cleanup. See `src/CLAUDE.md` for test infrastructure details.
