import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  FirmwareManifestSchema,
  SUPPORTED_CHIPS,
  getOtaFirmwareFilename,
} from '../../schemas/firmware-manifest';

const FIRMWARE_DIR = path.resolve(
  __dirname, '..', '..', '..', 'assets', 'esp32', 'firmware',
);

const manifest = FirmwareManifestSchema.parse(
  JSON.parse(fs.readFileSync(path.join(FIRMWARE_DIR, 'manifest.json'), 'utf-8')),
);

describe('firmware assets integrity', () => {
  it('manifest contains all supported chip variants', () => {
    for (const chip of SUPPORTED_CHIPS) {
      expect(manifest.variants[chip]).toBeDefined();
    }
  });

  for (const [chip, variant] of Object.entries(manifest.variants)) {
    describe(`${chip} variant`, () => {
      it('has a non-empty version string', () => {
        expect(variant.version.length).toBeGreaterThan(0);
      });

      for (const file of variant.files) {
        describe(file.name, () => {
          const filePath = path.join(FIRMWARE_DIR, file.name);

          it('exists on disk', () => {
            expect(
              fs.existsSync(filePath),
              `Missing firmware file: ${file.name}`,
            ).toBe(true);
          });

          it('has expected size', () => {
            const stat = fs.statSync(filePath);
            expect(stat.size).toBe(file.size);
          });

          it('has correct SHA256 checksum', () => {
            const contents = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256')
              .update(contents)
              .digest('hex');
            expect(hash).toBe(file.sha256);
          });
        });
      }
    });
  }

  describe('OTA firmware files', () => {
    for (const chip of SUPPORTED_CHIPS) {
      const otaFilename = getOtaFirmwareFilename(chip);

      it(`${otaFilename} exists`, () => {
        const filePath = path.join(FIRMWARE_DIR, otaFilename);
        expect(
          fs.existsSync(filePath),
          `OTA firmware missing: ${otaFilename}`,
        ).toBe(true);
      });

      it(`${otaFilename} is non-empty`, () => {
        const filePath = path.join(FIRMWARE_DIR, otaFilename);
        const stat = fs.statSync(filePath);
        expect(stat.size).toBeGreaterThan(0);
      });
    }
  });
});
