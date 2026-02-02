/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import type { AppServices, Logger } from '../services/service-factory';
import type { WindowManager } from '../window/window-manager';
import type { PowerSaveHandle } from '../services/service-startup';
import { configureSerialPort } from '../serial-port-config';
import { clearEffectsOnAllDrivers } from '../shutdown';
import pkg from '../../package.json';

export interface AppLifecycleDeps {
  services: AppServices;
  windowManager: WindowManager;
  powerSaveHandle: PowerSaveHandle | null;
  log: Logger;
}

/**
 * Registers all Electron app lifecycle event handlers.
 */
export function registerAppLifecycleHandlers(deps: AppLifecycleDeps): void {
  const { services, windowManager, powerSaveHandle, log } = deps;

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.on('ready', () => {
    // Set About panel options for macOS
    app.setAboutPanelOptions({
      applicationName: 'RGFX Hub',
      applicationVersion: pkg.version,
      copyright: 'Copyright © 2025 Matt Furniss',
      version: `Built with Electron ${process.versions.electron}`,
    });

    // Load Redux DevTools extension in development mode
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      const extensionPath = path.join(
        app.getPath('userData'),
        'extensions',
        'lmhkpmbekcpmknklioeibfkpmmfibljd',
      );

      session.defaultSession.extensions
        .loadExtension(extensionPath, {
          allowFileAccess: true,
        })
        .then(() => {
          log.info('Loaded Redux DevTools extension');
        })
        .catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          log.warn(`Redux DevTools not available: ${errorMessage}`);
        });
    }

    // Configure Web Serial API support
    configureSerialPort();

    windowManager.createWindow();
  });

  // Quit when all windows are closed, except on macOS
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Cleanup on app quit
  app.on('before-quit', () => {
    log.info('Shutting down...');

    // Stop power save blocker
    if (powerSaveHandle) {
      powerSaveHandle.stop();
    }

    // Stop periodic status updates
    windowManager.stopStatusUpdates();

    // Stop connection monitor
    services.driverRegistry.stopConnectionMonitor();

    // Stop event reader FIRST to prevent new effects during shutdown
    services.eventReader.stop();

    // Clear effects on all connected drivers, then stop remaining services
    clearEffectsOnAllDrivers(services.driverRegistry, services.mqtt)
      .catch((err: unknown) => {
        log.error('Failed to clear effects on shutdown:', err);
      })
      .finally(() => {
        services.udpClient.stop();
        services.networkManager.stop();
        void services.mqtt.stop();
      });
  });

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow();
    }
  });
}
