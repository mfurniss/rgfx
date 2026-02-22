import { ipcMain } from 'electron';
import type { DriverLogPersistence } from '../driver-log-persistence';
import { openFile } from './open-file-handler';
import { INVOKE_CHANNELS } from './contract';

interface OpenDriverLogHandlerDeps {
  driverLogPersistence: DriverLogPersistence;
}

export function registerOpenDriverLogHandler(deps: OpenDriverLogHandlerDeps): void {
  const { driverLogPersistence } = deps;

  ipcMain.handle(INVOKE_CHANNELS.openDriverLog, async (_event, driverId: string) => {
    const logPath = driverLogPersistence.getLogFilePath(driverId);
    return openFile(logPath);
  });
}
