/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WindowManagerDeps } from '../window-manager';

// Mock Electron modules
const mockBrowserWindow = vi.fn();
const mockIpcMainOn = vi.fn();
const mockCreateIPCHandler = vi.fn();
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

vi.mock('electron-trpc/main', () => ({
  createIPCHandler: mockCreateIPCHandler,
}));

vi.mock('../../trpc/router', () => ({
  appRouter: {},
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
  setZoomFactor: MockFn;
  openDevTools: MockFn;
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
      setZoomFactor: vi.fn(),
      openDevTools: vi.fn(),
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
        getSystemStatus: vi.fn().mockReturnValue({
          mqttBroker: 'running',
          driversConnected: 1,
          driversTotal: 2,
        }),
      } as never,
      driverRegistry: {
        getConnectedCount: vi.fn().mockReturnValue(1),
        getAllDrivers: vi.fn().mockReturnValue([]),
      } as never,
      eventReader: {
        getFileSizeBytes: vi.fn().mockReturnValue(1024),
      } as never,
      systemErrorTracker: {
        errors: [],
        hasCriticalError: vi.fn().mockReturnValue(false),
      } as never,
      eventStats: {
        getCount: vi.fn().mockReturnValue(0),
        increment: vi.fn(),
        reset: vi.fn(),
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

  it('should setup tRPC IPC handler', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();

    expect(mockCreateIPCHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        windows: [mockWindow],
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

    expect(mockDeps.systemMonitor.getSystemStatus).not.toHaveBeenCalled();
  });

  it('should send status when window is available', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();
    manager.sendSystemStatus();

    expect(mockDeps.systemMonitor.getSystemStatus).toHaveBeenCalled();
    expect(mockWebContents.send).toHaveBeenCalledWith('system:status', expect.anything());
  });

  it('should send events to renderer', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();
    manager.sendEventToRenderer('test:event', 'arg1', 'arg2');

    expect(mockWebContents.send).toHaveBeenCalledWith('test:event', 'arg1', 'arg2');
  });

  it('should not send events when window unavailable', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.sendEventToRenderer('test:event', 'arg1');

    expect(mockWebContents.send).not.toHaveBeenCalled();
  });

  it('should start and stop status updates', async () => {
    const { createWindowManager } = await import('../window-manager.js');
    const manager = createWindowManager(mockDeps);

    manager.createWindow();
    manager.startStatusUpdates();

    // Advance timer to trigger interval
    vi.advanceTimersByTime(1000);
    expect(mockDeps.systemMonitor.getSystemStatus).toHaveBeenCalled();

    vi.clearAllMocks();
    manager.stopStatusUpdates();

    // Advance timer again - should not trigger
    vi.advanceTimersByTime(1000);
    expect(mockDeps.systemMonitor.getSystemStatus).not.toHaveBeenCalled();
  });
});
