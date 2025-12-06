import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

class FirmwareVersionService {
  private readonly firmwareDir: string;

  constructor() {
    this.firmwareDir = app.isPackaged
      ? join(process.resourcesPath, 'firmware')
      : join(app.getAppPath(), 'assets', 'esp32', 'firmware');
    console.log('[FirmwareVersionService] Firmware directory:', this.firmwareDir);
  }

  getCurrentVersion(): string | null {
    try {
      const files = readdirSync(this.firmwareDir);

      // Find firmware file matching pattern: rgfx-firmware.{version}.bin
      const firmwareFile = files.find(f => f.startsWith('rgfx-firmware.') && f.endsWith('.bin'));

      if (!firmwareFile) {
        console.error('[FirmwareVersionService] No firmware file found matching pattern rgfx-firmware.*.bin');
        return null;
      }

      // Extract version from filename: rgfx-firmware.0.0.1-test.bin -> 0.0.1-test
      const version = firmwareFile.replace('rgfx-firmware.', '').replace('.bin', '');

      return version;
    } catch (error) {
      console.error('[FirmwareVersionService] Failed to load firmware version:', error);
      return null;
    }
  }

  needsUpdate(driverVersion: string | undefined): boolean {
    const currentVersion = this.getCurrentVersion();

    if (!currentVersion || !driverVersion) {
      return false;
    }

    return driverVersion !== currentVersion;
  }
}

// Singleton instance
export const firmwareVersionService = new FirmwareVersionService();
