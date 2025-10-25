// Preload script - bridges main and renderer processes with secure IPC API
import { contextBridge, ipcRenderer } from "electron";
import type { Device, SystemStatus } from "./types";

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("rgfx", {
  onDeviceConnected: (callback: (device: Device) => void) => {
    ipcRenderer.on("device:connected", (_event, device) => callback(device));
  },

  onDeviceDisconnected: (callback: (device: Device) => void) => {
    ipcRenderer.on("device:disconnected", (_event, device) => callback(device));
  },

  onSystemStatus: (callback: (status: SystemStatus) => void) => {
    ipcRenderer.on("system:status", (_event, status) => callback(status));
  },
});
