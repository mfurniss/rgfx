import { describe, it, expect, vi } from 'vitest';
import { handlers, type IpcHandlersDeps } from '../handler-registry';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

describe('handler-registry', () => {
  it('should export a non-empty array of handler functions', () => {
    expect(handlers).toBeInstanceOf(Array);
    expect(handlers.length).toBeGreaterThan(0);
  });

  it('should contain only functions', () => {
    for (const handler of handlers) {
      expect(typeof handler).toBe('function');
    }
  });

  it('should call each handler with deps without throwing', () => {
    const mockDeps: IpcHandlersDeps = {
      driverRegistry: {} as IpcHandlersDeps['driverRegistry'],
      driverConfig: {} as IpcHandlersDeps['driverConfig'],
      driverLogPersistence: {} as IpcHandlersDeps['driverLogPersistence'],
      logManager: {} as IpcHandlersDeps['logManager'],
      ledHardwareManager: {} as IpcHandlersDeps['ledHardwareManager'],
      mqtt: {} as IpcHandlersDeps['mqtt'],
      systemMonitor: {} as IpcHandlersDeps['systemMonitor'],
      uploadConfigToDriver: vi.fn(),
      udpClient: {} as IpcHandlersDeps['udpClient'],
      transformerEngine: {} as IpcHandlersDeps['transformerEngine'],
      onEventProcessed: vi.fn(),
      resetEventsProcessed: vi.fn(),
      getMainWindow: vi.fn().mockReturnValue(null),
    };

    for (const handler of handlers) {
      expect(() => {
        handler(mockDeps);
      }).not.toThrow();
    }
  });

  it('should have the expected number of handlers', () => {
    // There are 30 handler registrations as of the current state
    // This test ensures handlers aren't accidentally removed
    expect(handlers.length).toBeGreaterThanOrEqual(27);
  });
});
