import { ipcMain } from 'electron';
import { INVOKE_CHANNELS } from './contract';

interface ResetEventCountsHandlerDeps {
  resetEventsProcessed: () => void;
}

export function registerResetEventCountsHandler(deps: ResetEventCountsHandlerDeps): void {
  const { resetEventsProcessed } = deps;

  ipcMain.handle(INVOKE_CHANNELS.resetEventCounts, () => {
    resetEventsProcessed();
  });
}
