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
import type { DriverConfig } from '../driver-config';
import { requireDriver, sendToRenderer } from '../utils/driver-utils';

interface DeleteDriverHandlerDeps {
  driverRegistry: DriverRegistry;
  driverConfig: DriverConfig;
  getMainWindow: () => BrowserWindow | null;
}

export function registerDeleteDriverHandler(deps: DeleteDriverHandlerDeps): void {
  const { driverRegistry, driverConfig, getMainWindow } = deps;

  ipcMain.handle('driver:delete', (_event, driverId: string) => {
    log.info(`Deleting driver ${driverId}`);

    // Validate driver exists (don't need MAC for delete)
    requireDriver(driverId, driverRegistry);

    // Delete from persistence (drivers.json)
    const persistenceSuccess = driverConfig.deleteDriver(driverId);

    if (!persistenceSuccess) {
      throw new Error(`Failed to delete driver ${driverId} from persistence`);
    }

    // Delete from runtime registry
    driverRegistry.deleteDriver(driverId);

    // Notify renderer that driver was deleted
    sendToRenderer(getMainWindow, 'driver:deleted', driverId);

    log.info(`Driver ${driverId} deleted successfully`);
    return { success: true };
  });
}
