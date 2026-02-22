import { ipcMain } from 'electron';
import type { LogManager, LogSizes } from '../log-manager';
import { INVOKE_CHANNELS } from './contract';

interface LogsHandlerDeps {
  logManager: LogManager;
}

export function registerLogsHandler(deps: LogsHandlerDeps): void {
  const { logManager } = deps;

  ipcMain.handle(INVOKE_CHANNELS.getLogSizes, async (): Promise<LogSizes> => {
    return logManager.getSizes();
  });

  ipcMain.handle(INVOKE_CHANNELS.clearAllLogs, async (): Promise<void> => {
    return logManager.clearAll();
  });
}
