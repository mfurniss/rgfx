// Preload script - bridges main and renderer processes with secure IPC API
import { contextBridge, ipcRenderer } from "electron";
import type { Driver, SystemStatus } from "./types";

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("rgfx", {
  onDriverConnected: (callback: (driver: Driver) => void) => {
    ipcRenderer.on("driver:connected", (_event, driver: Driver) => { callback(driver); });
  },

  onDriverDisconnected: (callback: (driver: Driver) => void) => {
    ipcRenderer.on("driver:disconnected", (_event, driver: Driver) => { callback(driver); });
  },

  onSystemStatus: (callback: (status: SystemStatus) => void) => {
    ipcRenderer.on("system:status", (_event, status: SystemStatus) => { callback(status); });
  },
});
