import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

interface VersionInfo {
  version: string;
  generatedAt: string;
}

export class FirmwareVersionService {
  private readonly versionPath: string;

  constructor() {
    this.versionPath = app.isPackaged
      ? join(process.resourcesPath, 'esp32', 'firmware', 'version.json')
      : join(app.getAppPath(), 'public', 'esp32', 'firmware', 'version.json');
    console.log('[FirmwareVersionService] Version file path:', this.versionPath);
  }

  getCurrentVersion(): string | null {
    try {
      const versionData = readFileSync(this.versionPath, 'utf-8');
      const versionInfo = JSON.parse(versionData) as VersionInfo;
      return versionInfo.version;
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
