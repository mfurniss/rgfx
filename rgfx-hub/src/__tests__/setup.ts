import { afterEach, beforeEach, vi } from 'vitest';
import React from 'react';
import { cleanup } from '@testing-library/react';
import { seedRandom } from '../utils/random';

// Global mocks for electron and electron-log (most tests need these)
// Per-file vi.mock() calls will override these when custom mock behavior is needed
vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
    verbose: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

// ESM resolution in tasmota-webserial-esptool is broken under vitest
vi.mock('tasmota-webserial-esptool', () => ({
  ESPLoader: vi.fn(),
  connectWithPort: vi.fn(),
}));

// Make React globally available for JSX transform
(globalThis as any).React = React;

// Define Vite globals injected by Electron Forge at build time
// These must be defined for tests that import window-manager
(globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = undefined;
(globalThis as any).MAIN_WINDOW_VITE_NAME = 'main_window';

// jsdom compatibility mocks (from Mantine's vitest guide)
// These are required for MUI components and @testing-library to work correctly

// Fix getComputedStyle for jsdom - prevents flaky tests with MUI Modal
const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);

// Mock scroll methods (not available in jsdom)
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.HTMLElement.prototype.scrollIntoView = () => {};
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.Element.prototype.scrollTo = () => {};

// Mock matchMedia (required for MUI responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver (required for Recharts and responsive components)
class ResizeObserverMock {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

// Seed random number generator for deterministic tests
const TEST_SEED = 12345;
beforeEach(() => {
  seedRandom(TEST_SEED);
});

// Track resources for cleanup (prevents hung processes)
interface CleanupResource {
  stop?: () => void | Promise<void>;
  close?: () => void | Promise<void>;
  dispose?: () => void | Promise<void>;
}
const activeResources: CleanupResource[] = [];

/**
 * Track a resource that needs cleanup
 * Resources should have stop(), close(), or dispose() methods
 */
export function trackResource(resource: any): void {
  if (resource && (resource.stop || resource.close || resource.dispose)) {
    activeResources.push(resource);
  }
}

// Global cleanup to prevent timer leaks and hung processes
afterEach(async () => {
  // Clean up rendered React components to prevent test isolation issues
  cleanup();

  vi.clearAllTimers();

  // Force cleanup of all tracked resources
  for (const resource of activeResources) {
    try {
      await resource.stop?.();
      await resource.close?.();
      await resource.dispose?.();
    } catch {
      // Ignore cleanup errors in tests
    }
  }
  activeResources.length = 0;

  // NOTE: restoreAllMocks() disabled because it breaks vi.mock() with vi.fn()
  // Tests that use vi.spyOn() should manually restore their spies
  // vi.restoreAllMocks();
});

// Emergency cleanup after all tests complete
// NOTE: Commented out - Vitest doesn't like process.exit() in tests
// If you experience hung processes, uncomment and run tests with NODE_OPTIONS="--trace-warnings"
// afterAll(() => {
//   if (process.env.VITEST) {
//     const timeout = setTimeout(() => {
//       console.warn('⚠️  Force exiting test process after 2 seconds - possible resource leak');
//       process.exit(0);
//     }, 2000);
//     timeout.unref();
//   }
// });
