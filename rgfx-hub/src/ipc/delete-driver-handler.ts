/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { DriverPersistence } from '../driver-persistence';

interface DeleteDriverHandlerDeps {
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  getMainWindow: () => BrowserWindow | null;
}

export function registerDeleteDriverHandler(deps: DeleteDriverHandlerDeps): void {
  const { driverRegistry, driverPersistence, getMainWindow } = deps;

  ipcMain.handle('driver:delete', (_event, driverId: string) => {
    log.info(`Deleting driver ${driverId}`);

    const driver = driverRegistry.getDriver(driverId);

    if (!driver) {
      throw new Error(`No driver found with ID ${driverId}`);
    }

    // Delete from persistence (drivers.json)
    const persistenceSuccess = driverPersistence.deleteDriver(driverId);

    if (!persistenceSuccess) {
      throw new Error(`Failed to delete driver ${driverId} from persistence`);
    }

    // Delete from runtime registry
    driverRegistry.deleteDriver(driverId);

    // Notify renderer that driver was deleted
    const mainWindow = getMainWindow();

    if (mainWindow !== null && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('driver:deleted', driverId);
    }

    log.info(`Driver ${driverId} deleted successfully`);
    return { success: true };
  });
}
