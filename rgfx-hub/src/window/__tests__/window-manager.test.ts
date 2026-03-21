import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WindowManagerDeps } from '../window-manager';
import { IPC } from '@/config/ipc-channels';

// Mock Electron modules
const mockBrowserWindow = vi.fn();
const mockIpcMainOn = vi.fn();
const mockWindowStateKeeper = vi.fn().mockReturnValue({
  x: 100,
  y: 100,
  width: 1024,
  height: 768,
  manage: vi.fn(),
});

vi.mock('electron', () => ({
  app: {
    quit: vi.fn(),
  },
  BrowserWindow: mockBrowserWindow,
  ipcMain: {
    on: mockIpcMainOn,
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

vi.mock('electron-window-state', () => ({
  default: mockWindowStateKeeper,
}));

vi.mock('../../config/constants', () => ({
  MAIN_WINDOW_WIDTH: 1024,
  MAIN_WINDOW_HEIGHT: 768,
  MAIN_WINDOW_ZOOM_FACTOR: 1.0,
  OPEN_DEVTOOLS_IN_DEV: false,
  SYSTEM_STATUS_UPDATE_INTERVAL_MS: 1000,
}));

vi.mock('../../config/paths', () => ({
  CONFIG_DIRECTORY: '/mock/config',
}));

type MockFn = ReturnType<typeof vi.fn>;

interface MockWebContents {
  send: MockFn;
  on: MockFn;
  once: MockFn;
  setZoomFactor: MockFn;
  openDevTools: MockFn;
  isDestroyed: MockFn;
}

interface MockWindow {
  isDestroyed: MockFn;
  loadURL: MockFn;
  loadFile: MockFn;
  webContents: MockWebContents;
  on: MockFn;
}

describe('createWindowManager', () => {
  let mockDeps: WindowManagerDeps;
  let mockWebContents: MockWebContents;
  let mockWindow: MockWindow;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockWebContents = {
      send: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      setZoomFactor: vi.fn(),
      openDevTools: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    mockWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      loadURL: vi.fn().mockResolvedValue(undefined),
      loadFile: vi.fn().mockResolvedValue(undefined),
      webContents: mockWebContents,
      on: vi.fn(),
    };

    mockBrowserWindow.mockReturnValue(mockWindow);

    mockDeps = {
      systemMonitor: {
        getFullStatus: vi.fn().mockReturnValue({
          mqttBroker: 'running',
          driversConnected: 1,
          driversTotal: 2,
        }),
      } as never,
      driverRegistry: {
        getAllDrivers: vi.fn().mockReturnValue([]),
      } as never,
      systemErrorTracker: {
        hasCriticalError: vi.fn().mockReturnValue(false),
      } as never,
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as never,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null window before createWindow is called', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    expect(manager.getWindow()).toBeNull();
  });

  it('should return false for isAvailable when no window exists', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    expect(manager.isAvailable()).toBe(false);
  });

  it('should return false for isAvailable when window is destroyed', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();
    mockWindow.isDestroyed.mockReturnValue(true);

    expect(manager.isAvailable()).toBe(false);
  });

  it('should return true for isAvailable when window exists and not destroyed', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    expect(manager.isAvailable()).toBe(true);
  });

  it('should create window with correct configuration', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    expect(mockBrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundColor: '#121212',
        webPreferences: expect.objectContaining({
          contextIsolation: true,
          nodeIntegration: false,
          backgroundThrottling: false,
        }),
      }),
    );
  });

  it('should register renderer:ready handler', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    expect(mockIpcMainOn).toHaveBeenCalledWith('renderer:ready', expect.any(Function));
  });

  it('should not send status when window unavailable', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.sendSystemStatus();

    expect(mockDeps.systemMonitor.getFullStatus).not.toHaveBeenCalled();
  });

  it('should send status when window is available', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();
    manager.sendSystemStatus();

    expect(mockDeps.systemMonitor.getFullStatus).toHaveBeenCalled();
    expect(mockWebContents.send).toHaveBeenCalledWith('system:status', expect.anything());
  });

  it('should send events to renderer', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();
    manager.sendEventToRenderer(IPC.DRIVER_UPDATED, 'arg1', 'arg2');

    expect(mockWebContents.send).toHaveBeenCalledWith(IPC.DRIVER_UPDATED, 'arg1', 'arg2');
  });

  it('should not send events when window unavailable', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.sendEventToRenderer(IPC.DRIVER_UPDATED, 'arg1');

    expect(mockWebContents.send).not.toHaveBeenCalled();
  });

  it('should start and stop status updates', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();
    manager.startStatusUpdates();

    // Advance timer to trigger interval
    vi.advanceTimersByTime(1000);
    expect(mockDeps.systemMonitor.getFullStatus).toHaveBeenCalled();

    vi.clearAllMocks();
    manager.stopStatusUpdates();

    // Advance timer again - should not trigger
    vi.advanceTimersByTime(1000);
    expect(mockDeps.systemMonitor.getFullStatus).not.toHaveBeenCalled();
  });

  it('should load production build when no dev server URL', async () => {
    (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = undefined;

    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    expect(mockWindow.loadFile).toHaveBeenCalled();
    expect(mockWindow.loadURL).not.toHaveBeenCalled();
  });

  it('should load dev server when URL is set', async () => {
    (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:5173';

    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:5173');

    (globalThis as any).MAIN_WINDOW_VITE_DEV_SERVER_URL = undefined;
  });

  it('should set zoom factor after page load', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    // Find the did-finish-load handler
    const didFinishLoad = mockWebContents.on.mock.calls.find(
      (c: unknown[]) => c[0] === 'did-finish-load',
    )?.[1];

    expect(didFinishLoad).toBeDefined();
    didFinishLoad();

    expect(mockWebContents.setZoomFactor).toHaveBeenCalledWith(1.0);
  });

  it('should quit app on window close', async () => {
    const { app } = await import('electron');
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    const closeHandler = mockWindow.on.mock.calls.find(
      (c: unknown[]) => c[0] === 'close',
    )?.[1];

    expect(closeHandler).toBeDefined();
    closeHandler();

    expect(app.quit).toHaveBeenCalled();
  });

  it('should handle render-process-gone by reloading', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    const crashHandler = mockWebContents.on.mock.calls.find(
      (c: unknown[]) => c[0] === 'render-process-gone',
    )?.[1];

    expect(crashHandler).toBeDefined();

    // Add reload mock
    (mockWindow as any).reload = vi.fn();

    crashHandler({}, { reason: 'crashed' });

    // Advance past the 500ms delay
    vi.advanceTimersByTime(500);

    expect((mockWindow as any).reload).toHaveBeenCalled();
  });

  it('should handle did-fail-load by retrying', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    const failHandler = mockWebContents.on.mock.calls.find(
      (c: unknown[]) => c[0] === 'did-fail-load',
    )?.[1];

    expect(failHandler).toBeDefined();

    (mockWindow as any).reload = vi.fn();

    failHandler({}, -6, 'ERR_CONNECTION_REFUSED', 'http://localhost:5173');

    vi.advanceTimersByTime(1000);

    expect((mockWindow as any).reload).toHaveBeenCalled();
  });

  it('should send initial driver state on renderer:ready', async () => {
    const mockDriver = { id: 'test-driver', state: 'connected' };
    mockDeps.driverRegistry = {
      getAllDrivers: vi.fn().mockReturnValue([mockDriver]),
    } as never;

    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    // Get the renderer:ready handler
    const readyHandler = mockIpcMainOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'renderer:ready',
    )?.[1];

    expect(readyHandler).toBeDefined();
    readyHandler();

    // Should send system status
    expect(mockDeps.systemMonitor.getFullStatus).toHaveBeenCalled();

    // Should send driver state
    expect(mockWebContents.send).toHaveBeenCalledWith(IPC.DRIVER_UPDATED, mockDriver);
  });

  it('should skip driver state when critical error on renderer:ready', async () => {
    mockDeps.systemErrorTracker = {
      hasCriticalError: vi.fn().mockReturnValue(true),
    } as never;

    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    const readyHandler = mockIpcMainOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'renderer:ready',
    )?.[1];

    readyHandler();

    // Should still send system status (includes critical error info)
    expect(mockDeps.systemMonitor.getFullStatus).toHaveBeenCalled();

    // Should NOT send driver state
    expect(mockWebContents.send).not.toHaveBeenCalledWith(
      IPC.DRIVER_UPDATED,
      expect.anything(),
    );
  });

  it('should focus window including restoring minimized state', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    (mockWindow as any).isMinimized = vi.fn().mockReturnValue(true);
    (mockWindow as any).restore = vi.fn();
    (mockWindow as any).focus = vi.fn();

    manager.focusWindow();

    expect((mockWindow as any).restore).toHaveBeenCalled();
    expect((mockWindow as any).focus).toHaveBeenCalled();
  });

  it('should focus window without restore when not minimized', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    (mockWindow as any).isMinimized = vi.fn().mockReturnValue(false);
    (mockWindow as any).restore = vi.fn();
    (mockWindow as any).focus = vi.fn();

    manager.focusWindow();

    expect((mockWindow as any).restore).not.toHaveBeenCalled();
    expect((mockWindow as any).focus).toHaveBeenCalled();
  });

  it('should replace existing status updates on startStatusUpdates', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();
    manager.startStatusUpdates();
    manager.startStatusUpdates(); // Call twice — should not double-fire

    vi.advanceTimersByTime(1000);

    // Should be called once per interval (not doubled)
    type MockFnType = ReturnType<typeof vi.fn>;
    const mock = mockDeps.systemMonitor.getFullStatus as MockFnType;
    const callCount = mock.mock.calls.length;
    expect(callCount).toBe(1);
  });

  it('should be safe to stopStatusUpdates when not started', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    // Should not throw
    expect(() => {
      manager.stopStatusUpdates();
    }).not.toThrow();
  });
});
