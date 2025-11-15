import { afterEach, vi } from 'vitest';
import React from 'react';

// Make React globally available for JSX transform

(globalThis as any).React = React;

// Global cleanup to prevent timer leaks between tests
afterEach(() => {
  vi.clearAllTimers();
  // NOTE: restoreAllMocks() disabled because it breaks vi.mock() with vi.fn()
  // Tests that use vi.spyOn() should manually restore their spies
  // vi.restoreAllMocks();
});
