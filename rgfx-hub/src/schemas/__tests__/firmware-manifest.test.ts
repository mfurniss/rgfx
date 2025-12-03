/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { FirmwareManifestSchema } from '../firmware-manifest';

describe('FirmwareManifestSchema', () => {
  const validManifest = {
    version: '1.2.3',
    generatedAt: '2025-01-15T10:30:00Z',
    files: [
      {
        name: 'bootloader.bin',
        address: 0x1000,
        size: 26640,
        sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      },
      {
        name: 'partition-table.bin',
        address: 0x8000,
        size: 3072,
        sha256: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      },
      {
        name: 'firmware.bin',
        address: 0x10000,
        size: 1500000,
        sha256: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      },
    ],
  };

  describe('valid data', () => {
    it('should accept complete manifest', () => {
      const result = FirmwareManifestSchema.safeParse(validManifest);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.version).toBe('1.2.3');
        expect(result.data.files).toHaveLength(3);
      }
    });

    it('should accept manifest with single file', () => {
      const data = {
        version: '1.0.0',
        generatedAt: '2025-01-01T00:00:00Z',
        files: [
          {
            name: 'firmware.bin',
            address: 0x0,
            size: 1000000,
            sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          },
        ],
      };

      const result = FirmwareManifestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept uppercase SHA256 hash', () => {
      const data = {
        version: '1.0.0',
        generatedAt: '2025-01-01T00:00:00Z',
        files: [
          {
            name: 'firmware.bin',
            address: 0x0,
            size: 1000000,
            sha256: 'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
          },
        ],
      };

      const result = FirmwareManifestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('version validation', () => {
    it('should reject empty version', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        version: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept various version formats', () => {
      const versions = ['1.0.0', '0.0.1', '2.10.300', 'v1.0.0', '1.0.0-alpha', '1.0.0-beta.1'];

      for (const version of versions) {
        const result = FirmwareManifestSchema.safeParse({
          ...validManifest,
          version,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('generatedAt validation', () => {
    it('should reject missing generatedAt', () => {
      const { generatedAt: _, ...data } = validManifest;
      const result = FirmwareManifestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept various date formats', () => {
      const dates = ['2025-01-15T10:30:00Z', '2025-01-15', 'Jan 15, 2025', '1705312200'];

      for (const generatedAt of dates) {
        const result = FirmwareManifestSchema.safeParse({
          ...validManifest,
          generatedAt,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('files validation', () => {
    it('should reject empty files array', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        files: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing files', () => {
      const { files: _, ...data } = validManifest;
      const result = FirmwareManifestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('file entry validation', () => {
    const validFile = {
      name: 'test.bin',
      address: 0x1000,
      size: 1000,
      sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    };

    it('should reject file with empty name', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        files: [{ ...validFile, name: '' }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject file with negative address', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        files: [{ ...validFile, address: -1 }],
      });
      expect(result.success).toBe(false);
    });

    it('should accept file with address 0', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        files: [{ ...validFile, address: 0 }],
      });
      expect(result.success).toBe(true);
    });

    it('should reject file with zero size', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        files: [{ ...validFile, size: 0 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject file with negative size', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        files: [{ ...validFile, size: -100 }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sha256 validation', () => {
    const baseFile = {
      name: 'test.bin',
      address: 0x1000,
      size: 1000,
    };

    it('should reject SHA256 with wrong length', () => {
      const invalidHashes = [
        'abcdef', // too short
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', // 65 chars
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b', // 63 chars
      ];

      for (const sha256 of invalidHashes) {
        const result = FirmwareManifestSchema.safeParse({
          ...validManifest,
          files: [{ ...baseFile, sha256 }],
        });
        expect(result.success).toBe(false);
      }
    });

    it('should reject SHA256 with invalid characters', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        files: [
          {
            ...baseFile,
            sha256: 'g1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid SHA256 hashes', () => {
      const validHashes = [
        '0000000000000000000000000000000000000000000000000000000000000000',
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        'a1b2c3d4e5f6A1B2C3D4E5F6a1b2c3d4e5f6A1B2C3D4E5F6a1b2c3d4e5f6a1b2',
      ];

      for (const sha256 of validHashes) {
        const result = FirmwareManifestSchema.safeParse({
          ...validManifest,
          files: [{ ...baseFile, sha256 }],
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
