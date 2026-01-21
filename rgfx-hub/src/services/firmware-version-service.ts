import { readFileSync } from 'node:fs';
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
      const manifestPath = join(this.firmwareDir, 'manifest.json');
      const manifestContent = readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent) as { version: string };

      return manifest.version;
    } catch (error) {
      console.error('[FirmwareVersionService] Failed to load firmware version from manifest:', error);
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
