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
      defaultRgfxConfigDir: `${home}/.rgfx`,
      defaultMameRomsDir: `${home}/mame-roms`,
    };
  });
}
