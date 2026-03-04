import { app } from 'electron';
import path from 'node:path';

/**
 * Resolve the firmware directory.
 * In development: <appPath>/assets/esp32/firmware
 * In production: <resourcesPath>/firmware
 */
export function getFirmwareDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'firmware')
    : path.join(app.getAppPath(), 'assets', 'esp32', 'firmware');
}

export function getFirmwareFilePath(filename: string): string {
  return path.join(getFirmwareDir(), filename);
}
