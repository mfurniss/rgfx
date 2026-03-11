import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: { readFileSync: mockReadFileSync },
  readFileSync: mockReadFileSync,
}));

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/test/app/path',
  },
}));

const validManifest = {
  generatedAt: '2025-01-01T00:00:00Z',
  variants: {
    ESP32: {
      version: '1.2.3',
      files: [{
        name: 'firmware-esp32.bin',
        address: 0x10000,
        size: 1000000,
        sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      }],
    },
    'ESP32-S3': {
      version: '1.2.4',
      files: [{
        name: 'firmware-esp32s3.bin',
        address: 0x10000,
        size: 1100000,
        sha256: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      }],
    },
  },
};

describe('FirmwareVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('getVersions', () => {
    it('should return all variant versions from manifest', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const versions = firmwareVersionService.getVersions();

      expect(versions).toEqual({
        'ESP32': '1.2.3',
        'ESP32-S3': '1.2.4',
      });
    });

    it('should return empty object when manifest cannot be read', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const versions = firmwareVersionService.getVersions();

      expect(versions).toEqual({});
    });

    it('should return empty object when manifest contains invalid JSON', async () => {
      mockReadFileSync.mockReturnValue('invalid json');

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const versions = firmwareVersionService.getVersions();

      expect(versions).toEqual({});
    });
  });

  describe('getVersionForChip', () => {
    it('should return version for ESP32', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getVersionForChip('ESP32');

      expect(version).toBe('1.2.3');
    });

    it('should return version for ESP32-S3', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getVersionForChip('ESP32-S3');

      expect(version).toBe('1.2.4');
    });

    it('should return null when manifest cannot be read', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getVersionForChip('ESP32');

      expect(version).toBeNull();
    });
  });

  describe('needsUpdate', () => {
    it('should return true when bundled firmware is newer than driver', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0', 'ESP32');

      expect(needsUpdate).toBe(true);
    });

    it('should return false when versions match for ESP32', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.2.3', 'ESP32');

      expect(needsUpdate).toBe(false);
    });

    it('should return false when driver is running newer firmware than bundled', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');

      // Bundled is 1.2.3, driver is running 1.3.0 — no downgrade
      expect(firmwareVersionService.needsUpdate('1.3.0', 'ESP32')).toBe(false);
    });

    it('should return false when bundled is a dev prerelease of same version', async () => {
      const devManifest = {
        ...validManifest,
        variants: {
          ...validManifest.variants,
          ESP32: {
            ...validManifest.variants.ESP32,
            version: '1.0.12-dev+c6c2a4a8',
          },
        },
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(devManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');

      // Bundled 1.0.12-dev < driver 1.0.13 — no update
      expect(firmwareVersionService.needsUpdate('1.0.13', 'ESP32')).toBe(false);
      // Bundled 1.0.12-dev < driver 1.0.12 — no update (prerelease < release)
      expect(firmwareVersionService.needsUpdate('1.0.12', 'ESP32')).toBe(false);
    });

    it('should compare against correct chip variant', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');

      // ESP32 version is 1.2.3, ESP32-S3 version is 1.2.4
      // Driver with version 1.2.3 on ESP32-S3 should need update (1.2.4 > 1.2.3)
      expect(firmwareVersionService.needsUpdate('1.2.3', 'ESP32-S3')).toBe(true);
      // Driver with version 1.2.4 on ESP32-S3 should NOT need update
      expect(firmwareVersionService.needsUpdate('1.2.4', 'ESP32-S3')).toBe(false);
    });

    it('should return false when driver version is undefined', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate(undefined, 'ESP32');

      expect(needsUpdate).toBe(false);
    });

    it('should return false when chip type is null', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0', null);

      expect(needsUpdate).toBe(false);
    });

    it('should return false when manifest cannot be read', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0', 'ESP32');

      expect(needsUpdate).toBe(false);
    });
  });
});
