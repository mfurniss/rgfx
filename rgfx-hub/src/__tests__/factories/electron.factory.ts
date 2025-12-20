/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { vi } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import type { BrowserWindow } from 'electron';

/**
 * Creates a mock Electron log object with all common log methods.
 * Use this to avoid repeating the electron-log mock structure in every test.
 *
 * @example
 * vi.mock('electron-log/main', () => ({
 *   default: createElectronLogMock(),
 * }));
 */
export function createElectronLogMock() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
    verbose: vi.fn(),
  };
}

/**
 * Creates a mock BrowserWindow with sensible defaults.
 * Window is not destroyed by default.
 *
 * @example
 * const mockWindow = createMockBrowserWindow();
 * mockWindow.isDestroyed.mockReturnValue(true); // Simulate destroyed window
 */
export function createMockBrowserWindow(): DeepMockProxy<BrowserWindow> {
  const mockWindow = mockDeep<BrowserWindow>();
  mockWindow.isDestroyed.mockReturnValue(false);
  return mockWindow;
}

/**
 * Creates a mock ipcMain.handle implementation that captures the registered handler.
 * Use this to test IPC handlers by extracting and calling them directly.
 *
 * @example
 * const { mockHandle, getHandler } = createMockIpcMainHandle();
 *
 * vi.mock('electron', () => ({
 *   ipcMain: { handle: mockHandle },
 * }));
 *
 * // After registering the handler:
 * const handler = getHandler<MyHandlerType>('my-channel');
 * const result = await handler(event, ...args);
 */
export function createMockIpcMainHandle() {
  type Handler = (...args: unknown[]) => unknown;
  const handlers = new Map<string, Handler>();

  const mockHandle = vi.fn((channel: string, handler: Handler) => {
    handlers.set(channel, handler);
  });

  function getHandler(channel: string): Handler {
    const handler = handlers.get(channel);

    if (!handler) {
      throw new Error(`No handler registered for channel: ${channel}`);
    }

    return handler;
  }

  return { mockHandle, getHandler };
}

/**
 * Creates a mock Electron app object with common properties and methods.
 *
 * @example
 * vi.mock('electron', () => ({
 *   app: createMockElectronApp({ isPackaged: true }),
 * }));
 */
export function createMockElectronApp(
  overrides: {
    isPackaged?: boolean;
    appPath?: string;
  } = {},
) {
  const { isPackaged = false, appPath = '/test/app/path' } = overrides;

  return {
    isPackaged,
    getAppPath: () => appPath,
    getPath: vi.fn().mockReturnValue('/test/user/data'),
    getName: vi.fn().mockReturnValue('rgfx-hub'),
    getVersion: vi.fn().mockReturnValue('1.0.0-test'),
    quit: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
  };
}
