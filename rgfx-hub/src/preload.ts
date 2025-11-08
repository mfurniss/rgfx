// Preload script - bridges main and renderer processes with secure IPC API
import { contextBridge, ipcRenderer } from "electron";
import type { Driver, SystemStatus } from "./types";

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
export const rgfxAPI = {
  onDriverConnected: (callback: (driver: Driver) => void): (() => void) => {
    console.log("[PRELOAD] Registering listener for driver:connected");
    const handler = (_event: Electron.IpcRendererEvent, driver: Driver) => {
      console.log(`[PRELOAD] IPC event received: driver:connected for ${driver.id}`);
      callback(driver);
    };
    ipcRenderer.on("driver:connected", handler);
    return () => {
      console.log("[PRELOAD] Removing listener for driver:connected");
      ipcRenderer.removeListener("driver:connected", handler);
    };
  },

  onDriverDisconnected: (callback: (driver: Driver) => void): (() => void) => {
    console.log("[PRELOAD] Registering listener for driver:disconnected");
    const handler = (_event: Electron.IpcRendererEvent, driver: Driver) => {
      console.log(`[PRELOAD] IPC event received: driver:disconnected for ${driver.id}`);
      callback(driver);
    };
    ipcRenderer.on("driver:disconnected", handler);
    return () => {
      console.log("[PRELOAD] Removing listener for driver:disconnected");
      ipcRenderer.removeListener("driver:disconnected", handler);
    };
  },

  onDriverUpdated: (callback: (driver: Driver) => void): (() => void) => {
    console.log("[PRELOAD] Registering listener for driver:updated");
    const handler = (_event: Electron.IpcRendererEvent, driver: Driver) => {
      console.log(`[PRELOAD] IPC event received: driver:updated for ${driver.id}`);
      callback(driver);
    };
    ipcRenderer.on("driver:updated", handler);
    return () => {
      console.log("[PRELOAD] Removing listener for driver:updated");
      ipcRenderer.removeListener("driver:updated", handler);
    };
  },

  onSystemStatus: (callback: (status: SystemStatus) => void): (() => void) => {
    console.log("[PRELOAD] Registering listener for system:status");
    const handler = (_event: Electron.IpcRendererEvent, status: SystemStatus) => {
      console.log(`[PRELOAD] IPC event received: system:status (mqttBroker: ${status.mqttBroker})`);
      callback(status);
    };
    ipcRenderer.on("system:status", handler);
    return () => {
      console.log("[PRELOAD] Removing listener for system:status");
      ipcRenderer.removeListener("system:status", handler);
    };
  },

  testDriverLEDs: (driverId: string, enabled: boolean): Promise<void> => {
    return ipcRenderer.invoke("driver:test-leds", driverId, enabled);
  },

  rendererReady: (): void => {
    ipcRenderer.send("renderer:ready");
  },
};

contextBridge.exposeInMainWorld("rgfx", rgfxAPI);
