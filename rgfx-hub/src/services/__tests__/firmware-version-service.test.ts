/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReaddirSync } = vi.hoisted(() => ({
  mockReaddirSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: { readdirSync: mockReaddirSync },
  readdirSync: mockReaddirSync,
}));

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/test/app/path',
  },
}));

describe('FirmwareVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('getCurrentVersion', () => {
    it('should extract version from firmware filename', async () => {
      mockReaddirSync.mockReturnValue([
        'bootloader.bin',
        'partitions.bin',
        'rgfx-firmware.1.2.3.bin',
      ]);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBe('1.2.3');
    });

    it('should handle version with pre-release suffix', async () => {
      mockReaddirSync.mockReturnValue(['rgfx-firmware.0.0.1-test.bin']);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBe('0.0.1-test');
    });

    it('should handle version with complex suffix', async () => {
      mockReaddirSync.mockReturnValue(['rgfx-firmware.2.0.0-beta.1+build.123.bin']);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBe('2.0.0-beta.1+build.123');
    });

    it('should return null when no firmware file found', async () => {
      mockReaddirSync.mockReturnValue([
        'bootloader.bin',
        'partitions.bin',
        'other-file.txt',
      ]);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBeNull();
    });

    it('should return null when directory is empty', async () => {
      mockReaddirSync.mockReturnValue([]);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBeNull();
    });

    it('should return null when readdirSync throws', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBeNull();
    });

    it('should pick first matching firmware file if multiple exist', async () => {
      mockReaddirSync.mockReturnValue([
        'rgfx-firmware.1.0.0.bin',
        'rgfx-firmware.2.0.0.bin',
      ]);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBe('1.0.0');
    });
  });

  describe('needsUpdate', () => {
    it('should return true when versions differ', async () => {
      mockReaddirSync.mockReturnValue(['rgfx-firmware.2.0.0.bin']);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0');

      expect(needsUpdate).toBe(true);
    });

    it('should return false when versions match', async () => {
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0');

      expect(needsUpdate).toBe(false);
    });

    it('should return false when driver version is undefined', async () => {
      mockReaddirSync.mockReturnValue(['rgfx-firmware.1.0.0.bin']);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate(undefined);

      expect(needsUpdate).toBe(false);
    });

    it('should return false when current firmware version is null', async () => {
      mockReaddirSync.mockReturnValue([]);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0');

      expect(needsUpdate).toBe(false);
    });

    it('should return false when both versions are missing', async () => {
      mockReaddirSync.mockReturnValue([]);

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate(undefined);

      expect(needsUpdate).toBe(false);
    });
  });
});
