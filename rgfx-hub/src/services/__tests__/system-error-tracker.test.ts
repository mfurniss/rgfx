/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SystemError } from '../../types';

// Create a mock event bus that we can control
const mockEventBus = vi.hoisted(() => {
  const handlers = new Map<string, ((payload: unknown) => void)[]>();
  return {
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, []);
      }
      handlers.get(event)!.push(handler);
    }),
    emit: vi.fn((event: string, payload: unknown) => {
      const eventHandlers = handlers.get(event);

      if (eventHandlers) {
        eventHandlers.forEach((handler) => {
          handler(payload);
        });
      }
    }),
    off: vi.fn(),
    _reset: () => {
      handlers.clear();
    },
  };
});

vi.mock('../event-bus', () => ({
  eventBus: mockEventBus,
}));

describe('createSystemErrorTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventBus._reset();
  });

  it('should subscribe to system:error events on creation', async () => {
    const { createSystemErrorTracker } = await import('../system-error-tracker.js');

    createSystemErrorTracker(10);

    expect(mockEventBus.on).toHaveBeenCalledWith('system:error', expect.any(Function));
  });

  it('should collect errors emitted via event bus', async () => {
    const { createSystemErrorTracker } = await import('../system-error-tracker.js');
    const tracker = createSystemErrorTracker(10);

    const error: SystemError = {
      errorType: 'interceptor',
      message: 'Test error',
      timestamp: Date.now(),
    };

    mockEventBus.emit('system:error', error);

    expect(tracker.errors).toHaveLength(1);
    expect(tracker.errors[0]).toEqual(error);
  });

  it('should cap errors at maxErrors (oldest removed first)', async () => {
    const { createSystemErrorTracker } = await import('../system-error-tracker.js');
    const tracker = createSystemErrorTracker(3);

    const errors: SystemError[] = [
      { errorType: 'interceptor', message: 'Error 1', timestamp: 1 },
      { errorType: 'interceptor', message: 'Error 2', timestamp: 2 },
      { errorType: 'interceptor', message: 'Error 3', timestamp: 3 },
      { errorType: 'interceptor', message: 'Error 4', timestamp: 4 },
    ];

    errors.forEach((error) => {
      mockEventBus.emit('system:error', error);
    });

    expect(tracker.errors).toHaveLength(3);
    expect(tracker.errors[0].message).toBe('Error 2');
    expect(tracker.errors[1].message).toBe('Error 3');
    expect(tracker.errors[2].message).toBe('Error 4');
  });

  it('should return false for hasCriticalError when no config errors', async () => {
    const { createSystemErrorTracker } = await import('../system-error-tracker.js');
    const tracker = createSystemErrorTracker(10);

    mockEventBus.emit('system:error', {
      errorType: 'interceptor',
      message: 'Non-critical',
      timestamp: Date.now(),
    });

    expect(tracker.hasCriticalError()).toBe(false);
  });

  it('should return true for hasCriticalError when config error exists', async () => {
    const { createSystemErrorTracker } = await import('../system-error-tracker.js');
    const tracker = createSystemErrorTracker(10);

    mockEventBus.emit('system:error', {
      errorType: 'config',
      message: 'Critical config error',
      timestamp: Date.now(),
    });

    expect(tracker.hasCriticalError()).toBe(true);
  });

  it('should allow manually adding errors via addError', async () => {
    const { createSystemErrorTracker } = await import('../system-error-tracker.js');
    const tracker = createSystemErrorTracker(10);

    const error: SystemError = {
      errorType: 'driver',
      message: 'Manual error',
      timestamp: Date.now(),
    };

    tracker.addError(error);

    expect(tracker.errors).toHaveLength(1);
    expect(tracker.errors[0]).toEqual(error);
  });

  it('should cap errors when adding manually', async () => {
    const { createSystemErrorTracker } = await import('../system-error-tracker.js');
    const tracker = createSystemErrorTracker(2);

    tracker.addError({ errorType: 'driver', message: 'Error 1', timestamp: 1 });
    tracker.addError({ errorType: 'driver', message: 'Error 2', timestamp: 2 });
    tracker.addError({ errorType: 'driver', message: 'Error 3', timestamp: 3 });

    expect(tracker.errors).toHaveLength(2);
    expect(tracker.errors[0].message).toBe('Error 2');
    expect(tracker.errors[1].message).toBe('Error 3');
  });

  it('should detect critical errors among multiple error types', async () => {
    const { createSystemErrorTracker } = await import('../system-error-tracker.js');
    const tracker = createSystemErrorTracker(10);

    tracker.addError({ errorType: 'interceptor', message: 'Error 1', timestamp: 1 });
    tracker.addError({ errorType: 'network', message: 'Error 2', timestamp: 2 });
    tracker.addError({ errorType: 'config', message: 'Critical', timestamp: 3 });
    tracker.addError({ errorType: 'general', message: 'Error 4', timestamp: 4 });

    expect(tracker.hasCriticalError()).toBe(true);
  });
});
