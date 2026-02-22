import { describe, it, expect } from 'vitest';
import {
  FirmwareManifestSchema,
  mapChipNameToVariant,
  getOtaFirmwareFilename,
  SUPPORTED_CHIPS,
} from '../firmware-manifest';

describe('FirmwareManifestSchema', () => {
  const validFile = {
    name: 'firmware-esp32.bin',
    address: 0x10000,
    size: 1500000,
    sha256: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  };

  const validManifest = {
    generatedAt: '2025-01-15T10:30:00Z',
    variants: {
      ESP32: {
        version: '1.2.3',
        files: [
          {
            name: 'bootloader-esp32.bin',
            address: 0x1000,
            size: 26640,
            sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          },
          {
            name: 'partitions-esp32.bin',
            address: 0x8000,
            size: 3072,
            sha256: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
          },
          {
            name: 'firmware-esp32.bin',
            address: 0x10000,
            size: 1500000,
            sha256: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
          },
        ],
      },
      'ESP32-S3': {
        version: '1.2.4',
        files: [
          {
            name: 'bootloader-esp32s3.bin',
            address: 0x0,
            size: 15104,
            sha256: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
          },
          {
            name: 'partitions-esp32s3.bin',
            address: 0x8000,
            size: 3072,
            sha256: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
          },
          {
            name: 'firmware-esp32s3.bin',
            address: 0x10000,
            size: 1350160,
            sha256: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
          },
        ],
      },
    },
  };

  describe('valid data', () => {
    it('should accept complete manifest with multiple variants', () => {
      const result = FirmwareManifestSchema.safeParse(validManifest);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(Object.keys(result.data.variants)).toHaveLength(2);
        expect(result.data.variants.ESP32.version).toBe('1.2.3');
        expect(result.data.variants.ESP32.files).toHaveLength(3);
        expect(result.data.variants['ESP32-S3'].version).toBe('1.2.4');
        expect(result.data.variants['ESP32-S3'].files).toHaveLength(3);
      }
    });

    it('should accept manifest with single variant', () => {
      const data = {
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {
          ESP32: {
            version: '1.0.0',
            files: [validFile],
          },
        },
      };

      const result = FirmwareManifestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept uppercase SHA256 hash', () => {
      const data = {
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {
          ESP32: {
            version: '1.0.0',
            files: [
              {
                ...validFile,
                sha256: 'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
              },
            ],
          },
        },
      };

      const result = FirmwareManifestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('variant version validation', () => {
    it('should reject empty version in variant', () => {
      const result = FirmwareManifestSchema.safeParse({
        generatedAt: '2025-01-01T00:00:00Z',
        variants: {
          ESP32: {
            version: '',
            files: [validFile],
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept various version formats in variant', () => {
      const versions = ['1.0.0', '0.0.1', '2.10.300', 'v1.0.0', '1.0.0-alpha', '1.0.0-beta.1'];

      for (const version of versions) {
        const result = FirmwareManifestSchema.safeParse({
          generatedAt: '2025-01-01T00:00:00Z',
          variants: {
            ESP32: {
              version,
              files: [validFile],
            },
          },
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

  describe('variants validation', () => {
    it('should reject missing variants', () => {
      const { variants: _, ...data } = validManifest;
      const result = FirmwareManifestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject variant with empty files array', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        variants: {
          ESP32: { version: '1.0.0', files: [] },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('file entry validation', () => {
    it('should reject file with empty name', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        variants: {
          ESP32: { version: '1.0.0', files: [{ ...validFile, name: '' }] },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject file with negative address', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        variants: {
          ESP32: { version: '1.0.0', files: [{ ...validFile, address: -1 }] },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept file with address 0 (ESP32-S3 bootloader)', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        variants: {
          'ESP32-S3': { version: '1.0.0', files: [{ ...validFile, address: 0 }] },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject file with zero size', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        variants: {
          ESP32: { version: '1.0.0', files: [{ ...validFile, size: 0 }] },
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject file with negative size', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        variants: {
          ESP32: { version: '1.0.0', files: [{ ...validFile, size: -100 }] },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sha256 validation', () => {
    it('should reject SHA256 with wrong length', () => {
      const invalidHashes = [
        'abcdef', // too short
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', // 65 chars
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b', // 63 chars
      ];

      for (const sha256 of invalidHashes) {
        const result = FirmwareManifestSchema.safeParse({
          ...validManifest,
          variants: {
            ESP32: { version: '1.0.0', files: [{ ...validFile, sha256 }] },
          },
        });
        expect(result.success).toBe(false);
      }
    });

    it('should reject SHA256 with invalid characters', () => {
      const result = FirmwareManifestSchema.safeParse({
        ...validManifest,
        variants: {
          ESP32: {
            version: '1.0.0',
            files: [
              {
                ...validFile,
                sha256: 'g1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
              },
            ],
          },
        },
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
          variants: {
            ESP32: { version: '1.0.0', files: [{ ...validFile, sha256 }] },
          },
        });
        expect(result.success).toBe(true);
      }
    });
  });
});

describe('mapChipNameToVariant', () => {
  it('should map ESP32 correctly', () => {
    expect(mapChipNameToVariant('ESP32')).toBe('ESP32');
    expect(mapChipNameToVariant('esp32')).toBe('ESP32');
    expect(mapChipNameToVariant('Esp32')).toBe('ESP32');
  });

  it('should map ESP32 variant names correctly', () => {
    // ESP-IDF reports detailed chip model names
    expect(mapChipNameToVariant('ESP32-D0WD-V3')).toBe('ESP32');
    expect(mapChipNameToVariant('ESP32-D0WD')).toBe('ESP32');
    expect(mapChipNameToVariant('ESP32-PICO-D4')).toBe('ESP32');
    expect(mapChipNameToVariant('ESP32-WROOM-32')).toBe('ESP32');
  });

  it('should map ESP32-S3 correctly', () => {
    expect(mapChipNameToVariant('ESP32-S3')).toBe('ESP32-S3');
    expect(mapChipNameToVariant('esp32-s3')).toBe('ESP32-S3');
    expect(mapChipNameToVariant('Esp32-S3')).toBe('ESP32-S3');
  });

  it('should map ESP32-S3 variant names correctly', () => {
    expect(mapChipNameToVariant('ESP32-S3-WROOM-1')).toBe('ESP32-S3');
    expect(mapChipNameToVariant('ESP32-S3-MINI-1')).toBe('ESP32-S3');
  });

  it('should return null for unsupported chips', () => {
    expect(mapChipNameToVariant('ESP32-C3')).toBeNull();
    expect(mapChipNameToVariant('ESP8266')).toBeNull();
    expect(mapChipNameToVariant('unknown')).toBeNull();
  });
});

describe('getOtaFirmwareFilename', () => {
  it('should return correct filename for ESP32', () => {
    expect(getOtaFirmwareFilename('ESP32')).toBe('firmware-esp32.bin');
  });

  it('should return correct filename for ESP32-S3', () => {
    expect(getOtaFirmwareFilename('ESP32-S3')).toBe('firmware-esp32s3.bin');
  });
});

describe('SUPPORTED_CHIPS', () => {
  it('should contain ESP32 and ESP32-S3', () => {
    expect(SUPPORTED_CHIPS).toContain('ESP32');
    expect(SUPPORTED_CHIPS).toContain('ESP32-S3');
    expect(SUPPORTED_CHIPS).toHaveLength(2);
  });
});
