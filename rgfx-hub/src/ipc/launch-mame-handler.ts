import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import { join } from 'path';
import log from 'electron-log/main';
import { SEND_CHANNELS } from './contract';
import { CONFIG_DIRECTORY } from '@/config/paths';

export function registerLaunchMameHandler(): void {
  ipcMain.on(SEND_CHANNELS.launchMame, (_event, romName: string) => {
    const isWindows = process.platform === 'win32';
    const scriptName = isWindows ? 'launch-mame.bat' : 'launch-mame.sh';
    const scriptPath = join(CONFIG_DIRECTORY, scriptName);

    log.info(`Launching MAME: ${romName}`);

    const child = isWindows
      ? spawn('cmd.exe', ['/c', scriptPath, romName], {
        detached: true,
        stdio: 'ignore',
      })
      : spawn(scriptPath, [romName], {
        detached: true,
        stdio: 'ignore',
      });

    child.on('error', (err) => {
      log.error(`Failed to launch MAME for ${romName}:`, err.message);
    });

    child.unref();
  });
}
