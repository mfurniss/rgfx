import { afterEach, vi } from 'vitest';
import React from 'react';

// Make React globally available for JSX transform
(globalThis as any).React = React;

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
