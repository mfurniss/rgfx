# Vitest API Reference

**Version:** Latest (as of January 2025)
**Source:** https://vitest.dev/api/

This document contains the Vitest API reference for test utilities, mocking, and assertions.

## Core Testing Utilities

### vi.waitFor

Wait for a callback to execute successfully with configurable polling.

**Signature:**
```typescript
function waitFor<T>(
  callback: WaitForCallback<T>,
  options?: number | WaitForOptions
): Promise<T>
```

**Options:**
```typescript
interface WaitForOptions {
  timeout?: number  // Default: 1000ms
  interval?: number // Default: 50ms
}
```

**Behavior:**
- Polls the callback at the specified interval
- Continues polling if callback throws or returns rejected promise
- Returns when callback succeeds or timeout is reached
- Automatically advances fake timers if `vi.useFakeTimers()` is active

**Usage:**
```typescript
// Wait for mock to be called
await vi.waitFor(() => {
  expect(mockFn).toHaveBeenCalledTimes(1);
});

// With custom timeout
await vi.waitFor(() => {
  expect(value).toBe(expected);
}, { timeout: 2000, interval: 100 });

// Wait for async condition
await vi.waitFor(async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

### vi.waitUntil

Similar to `waitFor` but with different error handling - stops immediately on errors.

**Signature:**
```typescript
function waitUntil<T>(
  callback: WaitUntilCallback<T>,
  options?: number | WaitUntilOptions
): Promise<T>
```

**Behavior:**
- Returns immediately when callback returns truthy value
- Continues polling on falsy results
- Throws immediately on errors (does not retry)
- Use when you want to wait for a condition, not retry on failures

**Usage:**
```typescript
// Wait until condition is true
await vi.waitUntil(() => mockFn.mock.calls.length > 0);

// Wait for value to exist
await vi.waitUntil(() => document.querySelector('.loaded'));
```

## Mock Functions

### vi.fn

Creates a spy function with call tracking and behavior control.

**Signature:**
```typescript
function fn<T extends (...args: any[]) => any>(
  implementation?: T
): MockInstance<T>
```

**Usage:**
```typescript
// Create mock with implementation
const mockFn = vi.fn((x) => x * 2);

// Create mock without implementation
const mockFn = vi.fn();

// Mock return values
mockFn.mockReturnValue(42);
mockFn.mockReturnValueOnce(1).mockReturnValueOnce(2);

// Mock implementations
mockFn.mockImplementation((x) => x + 1);
mockFn.mockImplementationOnce(() => 'first call');

// Mock resolved/rejected promises
mockFn.mockResolvedValue({ data: 'ok' });
mockFn.mockRejectedValue(new Error('failed'));
```

**Mock Inspection:**
```typescript
mockFn.mock.calls        // All call arguments: [[arg1, arg2], ...]
mockFn.mock.results      // All return values
mockFn.mock.instances    // All 'this' contexts
mockFn.mock.lastCall     // Last call arguments
```

### vi.spyOn

Spy on an object's method or property.

**Signature:**
```typescript
function spyOn<T, K extends keyof T>(
  object: T,
  method: K,
  accessType?: 'get' | 'set'
): MockInstance
```

**Usage:**
```typescript
const obj = {
  getValue: () => 42,
  count: 0
};

// Spy on method
const spy = vi.spyOn(obj, 'getValue');
spy.mockReturnValue(100);

// Spy on getter
const getSpy = vi.spyOn(obj, 'count', 'get');
getSpy.mockReturnValue(5);

// Spy on setter
const setSpy = vi.spyOn(obj, 'count', 'set');
```

### vi.mocked

Type helper for TypeScript to narrow mock types.

**Usage:**
```typescript
import { add } from './math';
vi.mock('./math');

const mockedAdd = vi.mocked(add);
mockedAdd.mockReturnValue(5); // TypeScript knows this is a mock
```

## Module Mocking

### vi.mock

Mock a module with automatic hoisting.

**Signature:**
```typescript
function mock(path: string, factory?: () => any): void
```

**Usage:**
```typescript
// Auto-mock entire module
vi.mock('./api');

// Mock with factory
vi.mock('./api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'test' }))
}));

// Partial mock
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchData: vi.fn()
  };
});
```

### vi.doMock

Non-hoisted module mock (evaluated where defined).

**Usage:**
```typescript
// Useful for dynamic mocks
if (condition) {
  vi.doMock('./api', () => ({ ... }));
}
const { api } = await import('./api');
```

### vi.importActual

Import the actual module, bypassing mocks.

**Usage:**
```typescript
const actual = await vi.importActual('./module');
```

### vi.resetModules

Clear module cache for fresh re-evaluation.

**Usage:**
```typescript
vi.resetModules();
const { module } = await import('./module'); // Fresh import
```

## Timer Management

### vi.useFakeTimers

Replace native timers with controllable versions.

**Usage:**
```typescript
vi.useFakeTimers();

// Now all setTimeout, setInterval, Date, etc. are fake
setTimeout(() => callback(), 1000);

vi.advanceTimersByTime(1000); // Fast-forward 1 second
```

### vi.useRealTimers

Restore native timers.

### vi.advanceTimersByTime

Fast-forward time by specified milliseconds.

**Usage:**
```typescript
vi.useFakeTimers();
const callback = vi.fn();
setTimeout(callback, 1000);

vi.advanceTimersByTime(500);  // Not called yet
vi.advanceTimersByTime(500);  // Now called
```

### vi.runAllTimers

Execute all pending timers immediately.

**Usage:**
```typescript
vi.runAllTimers(); // All setTimeout/setInterval callbacks run
```

### vi.setSystemTime

Mock the system clock.

**Usage:**
```typescript
vi.setSystemTime(new Date('2024-01-01'));
console.log(new Date()); // 2024-01-01
```

## Environment & Globals

### vi.stubEnv

Mock environment variables.

**Usage:**
```typescript
vi.stubEnv('API_KEY', 'test-key');
expect(process.env.API_KEY).toBe('test-key');
```

### vi.stubGlobal

Mock global variables.

**Usage:**
```typescript
vi.stubGlobal('navigator', { userAgent: 'test' });
```

### vi.unstubAllEnvs / vi.unstubAllGlobals

Restore original environment and global values.

## Cleanup & Reset

### vi.clearAllMocks

Clear all mock call history and results, but keep implementations.

### vi.resetAllMocks

Clear history and reset implementations to return `undefined`.

### vi.restoreAllMocks

Restore all `vi.spyOn` mocks to original implementations.

## Utility

### vi.isMockFunction

Check if a value is a mock function.

**Usage:**
```typescript
const mock = vi.fn();
vi.isMockFunction(mock); // true
```

### vi.hoisted

Execute code before imports (for module setup).

**Usage:**
```typescript
const { mockAdd } = vi.hoisted(() => ({
  mockAdd: vi.fn()
}));

vi.mock('./math', () => ({
  add: mockAdd
}));
```

## Best Practices

1. **Use `vi.waitFor` for polling conditions**
   - Replaces custom polling loops
   - Handles both sync and async callbacks
   - Automatically works with fake timers

2. **Use `vi.waitUntil` for simple conditions**
   - When you want to wait for truthy value
   - No retry on errors needed

3. **Avoid custom test helpers that duplicate Vitest APIs**
   - Check Vitest docs before writing custom utilities
   - Built-in APIs are more robust and maintained

4. **Clean up mocks properly**
   - Use `vi.clearAllMocks()` in `beforeEach` or `afterEach`
   - Restore spies with `vi.restoreAllMocks()`
   - Reset modules with `vi.resetModules()` when needed

5. **Type your mocks with `vi.mocked`**
   - Better TypeScript inference
   - Safer mock manipulation

## Common Patterns

### Waiting for async operations
```typescript
await vi.waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});
```

### Testing with fake timers
```typescript
vi.useFakeTimers();
const callback = vi.fn();
setTimeout(callback, 1000);
vi.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();
vi.useRealTimers();
```

### Partial module mocks
```typescript
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchUser: vi.fn(() => Promise.resolve({ id: 1 }))
  };
});
```

### Spy on console
```typescript
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
// ... code that logs errors
expect(consoleSpy).toHaveBeenCalledWith('error message');
consoleSpy.mockRestore();
```

## References

- Official Vitest Docs: https://vitest.dev/api/
- Mock API: https://vitest.dev/api/vi.html
- Expect API: https://vitest.dev/api/expect.html
