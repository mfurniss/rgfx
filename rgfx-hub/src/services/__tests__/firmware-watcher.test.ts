import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

type WatchCallback = (eventType: string, filename: string) => void;
type WatchMockCalls = [string, WatchCallback][];

// Create the watcher mock after imports are resolved
let mockWatcher: EventEmitter & { close: ReturnType<typeof vi.fn> };
const mockReaddirSync = vi.fn();
const mockExistsSync = vi.fn();
const mockWatch = vi.fn();

vi.mock('node:fs', () => ({
  default: {
    watch: (path: string, callback: WatchCallback) => mockWatch(path, callback),
    readdirSync: (path: string) => mockReaddirSync(path),
    existsSync: (path: string) => mockExistsSync(path),
  },
  watch: (path: string, callback: WatchCallback) => mockWatch(path, callback),
  readdirSync: (path: string) => mockReaddirSync(path),
  existsSync: (path: string) => mockExistsSync(path),
}));

function getWatchCallback(): WatchCallback {
  const calls = mockWatch.mock.calls as WatchMockCalls;
  return calls[0][1];
}

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/test/app/path',
  },
}));

describe('FirmwareWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();

    // Create fresh mock watcher for each test
    mockWatcher = new EventEmitter() as EventEmitter & { close: ReturnType<typeof vi.fn> };
    mockWatcher.close = vi.fn();

    // Configure mockWatch to return the mock watcher
    mockWatch.mockReturnValue(mockWatcher);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should detect initial firmware version on start', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      watcher.start();

      expect(watcher.getCurrentVersion()).toBe('1.0.0');
    });

    it('should start file watcher when directory exists', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      watcher.start();

      expect(mockWatch).toHaveBeenCalled();
    });

    it('should start polling when directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      watcher.start();

      // Should not call watch when directory doesn't exist
      expect(mockWatch).not.toHaveBeenCalled();
    });

    it('should handle null version when no firmware file exists', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      watcher.start();

      expect(watcher.getCurrentVersion()).toBeNull();
    });
  });

  describe('stop', () => {
    it('should close file watcher when stopped', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      watcher.start();
      watcher.stop();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should clear polling interval when stopped', async () => {
      mockExistsSync.mockReturnValue(false);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      watcher.start();
      watcher.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('firmware-updated event', () => {
    it('should emit firmware-updated when version changes', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync
        .mockReturnValueOnce(['rgfx-firmware.1.0.0.bin'])
        .mockReturnValueOnce(['rgfx-firmware.2.0.0.bin']);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      const eventHandler = vi.fn();
      watcher.on('firmware-updated', eventHandler);

      watcher.start();
      expect(watcher.getCurrentVersion()).toBe('1.0.0');

      // Simulate file change event
      getWatchCallback()('change', 'rgfx-firmware.2.0.0.bin');

      expect(eventHandler).toHaveBeenCalledWith('2.0.0');
      expect(watcher.getCurrentVersion()).toBe('2.0.0');
    });

    it('should not emit event when version stays the same', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      const eventHandler = vi.fn();
      watcher.on('firmware-updated', eventHandler);

      watcher.start();

      // Simulate file change event that doesn't change version
      getWatchCallback()('change', 'rgfx-firmware.1.0.0.bin');

      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should ignore non-firmware files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      const eventHandler = vi.fn();
      watcher.on('firmware-updated', eventHandler);

      watcher.start();

      // Simulate file change for non-firmware file
      getWatchCallback()('change', 'bootloader.bin');

      // readdirSync should only be called once (during start)
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should emit null when firmware file is removed', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync
        .mockReturnValueOnce(['rgfx-firmware.1.0.0.bin'])
        .mockReturnValueOnce([]);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      const eventHandler = vi.fn();
      watcher.on('firmware-updated', eventHandler);

      watcher.start();

      // Simulate file change event
      getWatchCallback()('rename', 'rgfx-firmware.1.0.0.bin');

      expect(eventHandler).toHaveBeenCalledWith(null);
      expect(watcher.getCurrentVersion()).toBeNull();
    });
  });

  describe('polling fallback', () => {
    it('should poll for firmware updates when directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      watcher.start();

      // Initially no firmware
      expect(watcher.getCurrentVersion()).toBeNull();

      // Directory appears with firmware
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const eventHandler = vi.fn();
      watcher.on('firmware-updated', eventHandler);

      // Advance time to trigger polling
      vi.advanceTimersByTime(5000);

      expect(eventHandler).toHaveBeenCalledWith('1.0.0');
    });

    it('should fall back to polling on watcher error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      watcher.start();

      // Simulate watcher error
      mockWatcher.emit('error', new Error('Watch error'));

      // Verify watcher was closed
      expect(mockWatcher.close).toHaveBeenCalled();

      // Now polling should be active - update firmware
      mockReaddirSync.mockReturnValue(['rgfx-firmware.2.0.0.bin']);

      const eventHandler = vi.fn();
      watcher.on('firmware-updated', eventHandler);

      vi.advanceTimersByTime(5000);

      expect(eventHandler).toHaveBeenCalledWith('2.0.0');
    });
  });

  describe('getCurrentVersion', () => {
    it('should return cached version without re-reading', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { FirmwareWatcher } = await import('../firmware-watcher.js');
      const watcher = new FirmwareWatcher();

      watcher.start();

      // Clear mock to verify no additional calls
      mockReaddirSync.mockClear();

      expect(watcher.getCurrentVersion()).toBe('1.0.0');
      expect(watcher.getCurrentVersion()).toBe('1.0.0');

      expect(mockReaddirSync).not.toHaveBeenCalled();
    });
  });
});
