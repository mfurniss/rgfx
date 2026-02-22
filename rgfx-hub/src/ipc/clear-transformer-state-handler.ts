import { ipcMain } from 'electron';
import type { TransformerEngine } from '../transformer-engine';
import { INVOKE_CHANNELS } from './contract';

interface ClearTransformerStateHandlerDeps {
  transformerEngine: TransformerEngine;
}

export function registerClearTransformerStateHandler(deps: ClearTransformerStateHandlerDeps): void {
  const { transformerEngine } = deps;

  ipcMain.handle(INVOKE_CHANNELS.clearTransformerState, () => {
    transformerEngine.clearState();
  });
}
