/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain, app } from 'electron';
import { join } from 'path';
import type { AppInfo } from '../types';
import pkg from '../../package.json';
import { INVOKE_CHANNELS } from './contract';

export function registerGetAppInfoHandler(): void {
  ipcMain.handle(INVOKE_CHANNELS.getAppInfo, (): AppInfo => {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';

    return {
      version: pkg.version,
      licensePath: app.isPackaged
        ? join(process.resourcesPath, 'LICENSE')
        : join(app.getAppPath(), '..', 'LICENSE'),
      docsPath: app.isPackaged
        ? join(process.resourcesPath, 'docs', 'index.html')
        : join(app.getAppPath(), '..', 'public-docs', 'site', 'index.html'),
      defaultRgfxConfigDir: `${home}/.rgfx`,
      defaultMameRomsDir: `${home}/mame-roms`,
    };
  });
}
