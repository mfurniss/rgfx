/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

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

describe('FirmwareVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('getCurrentVersion', () => {
    it('should extract version from manifest.json', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: '1.2.3',
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {},
      }));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBe('1.2.3');
      expect(mockReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        'utf-8',
      );
    });

    it('should handle version with pre-release suffix', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: '0.0.1-test',
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {},
      }));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBe('0.0.1-test');
    });

    it('should handle version with complex suffix', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: '2.0.0-beta.1+build.123',
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {},
      }));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBe('2.0.0-beta.1+build.123');
    });

    it('should return null when manifest.json cannot be read', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBeNull();
    });

    it('should return null when manifest.json contains invalid JSON', async () => {
      mockReadFileSync.mockReturnValue('invalid json');

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const version = firmwareVersionService.getCurrentVersion();

      expect(version).toBeNull();
    });
  });

  describe('needsUpdate', () => {
    it('should return true when versions differ', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: '2.0.0',
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {},
      }));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0');

      expect(needsUpdate).toBe(true);
    });

    it('should return false when versions match', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {},
      }));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0');

      expect(needsUpdate).toBe(false);
    });

    it('should return false when driver version is undefined', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {},
      }));

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate(undefined);

      expect(needsUpdate).toBe(false);
    });

    it('should return false when current firmware version is null', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate('1.0.0');

      expect(needsUpdate).toBe(false);
    });

    it('should return false when both versions are missing', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const { firmwareVersionService } = await import('../firmware-version-service.js');
      const needsUpdate = firmwareVersionService.needsUpdate(undefined);

      expect(needsUpdate).toBe(false);
    });
  });
});
