import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppLifecycleDeps } from '../app-lifecycle';
import type { AppServices } from '../../services/service-factory';
import type { WindowManager } from '../../window/window-manager';
import type { PowerSaveHandle } from '../../services/service-startup';

// Store app event handlers for testing
const appEventHandlers = new Map<string, (() => void)[]>();

const mockApp = {
  on: vi.fn((event: string, handler: () => void) => {
    if (!appEventHandlers.has(event)) {
      appEventHandlers.set(event, []);
    }
    appEventHandlers.get(event)!.push(handler);
  }),
  quit: vi.fn(),
  setAboutPanelOptions: vi.fn(),
  getPath: vi.fn().mockReturnValue('/mock/user/data'),
};

const mockSession = {
  defaultSession: {
    extensions: {
      loadExtension: vi.fn().mockResolvedValue(undefined),
    },
  },
};

const mockBrowserWindow = {
  getAllWindows: vi.fn().mockReturnValue([]),
};

vi.mock('electron', () => ({
  app: mockApp,
  session: mockSession,
  BrowserWindow: mockBrowserWindow,
}));

vi.mock('../../serial-port-config', () => ({
  configureSerialPort: vi.fn(),
}));

vi.mock('../../shutdown', () => ({
  clearEffectsOnAllDrivers: vi.fn().mockResolvedValue(undefined),
}));

const mockSetShuttingDown = vi.fn();
vi.mock('../../services/global-error-handler', () => ({
  setShuttingDown: mockSetShuttingDown,
}));

describe('registerAppLifecycleHandlers', () => {
  let mockServices: AppServices;
  let mockWindowManager: WindowManager;
  let mockPowerSaveHandle: PowerSaveHandle;
  let mockLog: AppLifecycleDeps['log'];
  let deps: AppLifecycleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    appEventHandlers.clear();

    mockServices = {
      mqtt: { stop: vi.fn().mockResolvedValue(undefined) },
      driverRegistry: { stopConnectionMonitor: vi.fn() },
      eventReader: { stop: vi.fn() },
      udpClient: { stop: vi.fn() },
      networkManager: { stop: vi.fn() },
    } as unknown as AppServices;

    mockWindowManager = {
      createWindow: vi.fn(),
      stopStatusUpdates: vi.fn(),
    } as unknown as WindowManager;

    mockPowerSaveHandle = {
      blockerId: 42,
      stop: vi.fn(),
    };

    mockLog = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as never;

    deps = {
      services: mockServices,
      windowManager: mockWindowManager,
      powerSaveHandle: mockPowerSaveHandle,
      log: mockLog,
    };
  });

  function triggerAppEvent(event: string): void {
    const handlers = appEventHandlers.get(event);

    if (handlers) {
      handlers.forEach((handler) => {
        handler();
      });
    }
  }

  it('should register all app lifecycle handlers', async () => {
    const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

    registerAppLifecycleHandlers(deps);

    expect(mockApp.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockApp.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
    expect(mockApp.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
    expect(mockApp.on).toHaveBeenCalledWith('activate', expect.any(Function));
  });

  describe('second-instance handler', () => {
    it('should focus the window when a second instance is launched', async () => {
      const mockFocusWindow = vi.fn();
      deps.windowManager = {
        ...deps.windowManager,
        focusWindow: mockFocusWindow,
      } as unknown as WindowManager;

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('second-instance');

      expect(mockFocusWindow).toHaveBeenCalled();
    });
  });

  describe('ready handler', () => {
    it('should set about panel options', async () => {
      (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = undefined;
      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('ready');

      expect(mockApp.setAboutPanelOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationName: 'RGFX Hub',
          copyright: 'Copyright © 2025 Matt Furniss',
        }),
      );
    });

    it('should create window', async () => {
      (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = undefined;
      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('ready');

      expect(mockWindowManager.createWindow).toHaveBeenCalled();
    });

    it('should load Redux DevTools in dev mode', async () => {
      // Set dev server URL to simulate dev mode
      (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:5173';

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('ready');

      expect(mockSession.defaultSession.extensions.loadExtension).toHaveBeenCalledWith(
        expect.stringContaining('lmhkpmbekcpmknklioeibfkpmmfibljd'),
        expect.objectContaining({ allowFileAccess: true }),
      );

      // Reset
      (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = undefined;
    });

    it('should handle Redux DevTools load failure gracefully', async () => {
      (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:5173';
      mockSession.defaultSession.extensions.loadExtension.mockRejectedValueOnce(
        new Error('Extension not found'),
      );

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('ready');

      // Should not throw — error is caught and logged as warning
      await vi.waitFor(() => {
        expect(mockLog.warn).toHaveBeenCalledWith(
          expect.stringContaining('Redux DevTools not available'),
        );
      });

      (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = undefined;
    });

    it('should not load Redux DevTools in production mode', async () => {
      (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = undefined;

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('ready');

      expect(mockSession.defaultSession.extensions.loadExtension).not.toHaveBeenCalled();
    });
  });

  describe('window-all-closed handler', () => {
    it('should quit app on non-macOS platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('window-all-closed');

      expect(mockApp.quit).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should not quit app on macOS', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('window-all-closed');

      expect(mockApp.quit).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('before-quit handler', () => {
    it('should stop power save blocker', async () => {
      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('before-quit');

      expect(mockPowerSaveHandle.stop).toHaveBeenCalled();
    });

    it('should handle null power save handle', async () => {
      deps.powerSaveHandle = null;

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      // Should not throw
      expect(() => {
        triggerAppEvent('before-quit');
      }).not.toThrow();
    });

    it('should stop status updates', async () => {
      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('before-quit');

      expect(mockWindowManager.stopStatusUpdates).toHaveBeenCalled();
    });

    it('should stop connection monitor', async () => {
      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('before-quit');

      expect(mockServices.driverRegistry.stopConnectionMonitor).toHaveBeenCalled();
    });

    it('should set shutting down flag to suppress socket errors', async () => {
      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('before-quit');

      expect(mockSetShuttingDown).toHaveBeenCalled();
    });

    it('should stop event reader', async () => {
      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('before-quit');

      expect(mockServices.eventReader.stop).toHaveBeenCalled();
    });
  });

  describe('activate handler', () => {
    it('should create window if no windows exist', async () => {
      mockBrowserWindow.getAllWindows.mockReturnValue([]);

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);
      triggerAppEvent('activate');

      expect(mockWindowManager.createWindow).toHaveBeenCalled();
    });

    it('should not create window if windows exist', async () => {
      mockBrowserWindow.getAllWindows.mockReturnValue([{}]);

      const { registerAppLifecycleHandlers } = await import('../app-lifecycle.js');

      registerAppLifecycleHandlers(deps);

      // Clear calls from ready handler
      mockWindowManager.createWindow = vi.fn();

      triggerAppEvent('activate');

      expect(mockWindowManager.createWindow).not.toHaveBeenCalled();
    });
  });
});
