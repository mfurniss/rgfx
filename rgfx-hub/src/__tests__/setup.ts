import { afterEach, vi } from "vitest";

// Global cleanup to prevent timer leaks between tests
afterEach(() => {
  vi.clearAllTimers();
  // NOTE: restoreAllMocks() disabled because it breaks vi.mock() with vi.fn()
  // Tests that use vi.spyOn() should manually restore their spies
  // vi.restoreAllMocks();
});
