import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import {
  FirmwareManifestSchema,
  type FirmwareManifest,
  type SupportedChip,
  SUPPORTED_CHIPS,
} from '../schemas/firmware-manifest';

type FirmwareVersions = Partial<Record<SupportedChip, string>>;

class FirmwareVersionService {
  private readonly firmwareDir: string;

  constructor() {
    this.firmwareDir = app.isPackaged
      ? join(process.resourcesPath, 'firmware')
      : join(app.getAppPath(), 'assets', 'esp32', 'firmware');
    console.log('[FirmwareVersionService] Firmware directory:', this.firmwareDir);
  }

  private getManifest(): FirmwareManifest | null {
    try {
      const manifestPath = join(this.firmwareDir, 'manifest.json');
      const manifestContent = readFileSync(manifestPath, 'utf-8');
      const parsed: unknown = JSON.parse(manifestContent);
      return FirmwareManifestSchema.parse(parsed);
    } catch (error) {
      console.error('[FirmwareVersionService] Failed to load manifest:', error);
      return null;
    }
  }

  /**
   * Get firmware versions for all chip types
   * Returns a record mapping chip type to version string
   */
  getVersions(): FirmwareVersions {
    const manifest = this.getManifest();

    if (!manifest) {
      return {};
    }

    const versions: FirmwareVersions = {};

    for (const chip of SUPPORTED_CHIPS) {
      const variant = manifest.variants[chip];

      // Defensive check - variant may not exist for all chip types
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (variant) {
        versions[chip] = variant.version;
      }
    }
    return versions;
  }

  /**
   * Get firmware version for a specific chip type
   */
  getVersionForChip(chipType: SupportedChip): string | null {
    const manifest = this.getManifest();

    if (!manifest) {
      return null;
    }

    // Variant may not exist for all chip types in the manifest
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return manifest.variants[chipType]?.version ?? null;
  }

  /**
   * Check if a driver needs firmware update based on its chip type
   */
  needsUpdate(driverVersion: string | undefined, chipType: SupportedChip | null): boolean {
    if (!driverVersion || !chipType) {
      return false;
    }

    const targetVersion = this.getVersionForChip(chipType);

    if (!targetVersion) {
      return false;
    }

    return driverVersion !== targetVersion;
  }
}

// Singleton instance
export const firmwareVersionService = new FirmwareVersionService();
