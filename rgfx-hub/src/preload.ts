// Preload script - bridges main and renderer processes with secure IPC API
import { contextBridge } from 'electron';
import { createPreloadAPI } from './ipc/create-preload';

export const rgfxAPI = createPreloadAPI();

contextBridge.exposeInMainWorld('rgfx', rgfxAPI);
