/**
 * Auto-generates the preload API from the IPC contract.
 * Loops over channel maps to create typed wrappers — no per-method boilerplate.
 */

import { ipcRenderer } from 'electron';
import {
  INVOKE_CHANNELS,
  PUSH_CHANNELS,
  SEND_CHANNELS,
} from './contract';
import type { RgfxAPI } from './contract';

export function createPreloadAPI(): RgfxAPI {
  const api: Record<string, unknown> = {};

  for (const [name, channel] of Object.entries(INVOKE_CHANNELS)) {
    api[name] = (...args: unknown[]) =>
      ipcRenderer.invoke(channel, ...args);
  }

  for (const [name, channel] of Object.entries(PUSH_CHANNELS)) {
    api[name] = (callback: (...args: unknown[]) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        ...args: unknown[]
      ) => {
        callback(...args);
      };
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    };
  }

  for (const [name, channel] of Object.entries(SEND_CHANNELS)) {
    api[name] = (...args: unknown[]) => {
      ipcRenderer.send(channel, ...args);
    };
  }

  return api as RgfxAPI;
}
