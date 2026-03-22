import { join as posixJoin } from 'node:path/posix';
import { join as win32Join } from 'node:path/win32';
import { ipcMain } from 'electron';
import log from 'electron-log/main';
import { updateLaunchScriptMamePath } from '../launch-script-updater';
import { detectMameVersion } from '../mame-detector';
import type { SystemMonitor } from '../system-monitor';
import { INVOKE_CHANNELS } from './contract';

const PLATFORM_CONFIG: Record<string, { exeName: string; join: typeof posixJoin }> = {
  darwin: { exeName: 'mame', join: posixJoin },
  win32: { exeName: 'mame.exe', join: win32Join },
};

interface UpdateMameDirHandlerDeps {
  systemMonitor: SystemMonitor;
}

export function registerUpdateMameDirHandler(deps: UpdateMameDirHandlerDeps): void {
  const { systemMonitor } = deps;

  ipcMain.handle(
    INVOKE_CHANNELS.updateMameDirectory,
    async (_event, mameDirectory: string) => {
      const config = PLATFORM_CONFIG[process.platform];

      // Empty directory clears the override (reverts to auto-detect)
      const mamePath = mameDirectory
        ? config.join(mameDirectory, config.exeName)
        : '';

      log.info(`Updating launch script MAME path: ${mamePath || '(auto-detect)'}`);
      await updateLaunchScriptMamePath(mamePath);

      // Detect version and update system status
      const mameVersion = await detectMameVersion(mameDirectory);
      systemMonitor.setMameVersion(mameVersion);

      return { success: true, mameVersion: mameVersion ?? undefined };
    },
  );
}
