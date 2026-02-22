import { z } from 'zod';

/**
 * Supported ESP32 chip types
 */
export const SUPPORTED_CHIPS = ['ESP32', 'ESP32-S3'] as const;
export type SupportedChip = (typeof SUPPORTED_CHIPS)[number];

/**
 * Firmware file entry schema
 */
const FirmwareFileSchema = z.object({
  name: z.string().min(1),
  address: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
});

export type FirmwareFile = z.infer<typeof FirmwareFileSchema>;

/**
 * Chip variant schema - contains version and files for a specific chip type
 */
const ChipVariantSchema = z.object({
  version: z.string().min(1),
  files: z.array(FirmwareFileSchema).min(1),
});

/**
 * Firmware manifest schema with multi-chip support
 *
 * Each variant tracks its own version independently, allowing different
 * chip types to be built at different times without causing false
 * "update needed" notifications.
 *
 * Structure:
 * {
 *   "generatedAt": "...",
 *   "variants": {
 *     "ESP32": { "version": "0.1.0-dev+abc123", "files": [...] },
 *     "ESP32-S3": { "version": "0.1.0-dev+def456", "files": [...] }
 *   }
 * }
 */
export const FirmwareManifestSchema = z.object({
  generatedAt: z.string(),
  variants: z.record(z.string(), ChipVariantSchema),
});

export type FirmwareManifest = z.infer<typeof FirmwareManifestSchema>;

/**
 * Maps chip names to manifest variant keys
 * Handles both esptool-js names (e.g., "ESP32", "ESP32-S3") and
 * ESP-IDF chip model names (e.g., "ESP32-D0WD-V3", "ESP32-S3-WROOM-1")
 */
export function mapChipNameToVariant(chipName: string): SupportedChip | null {
  const normalized = chipName.toUpperCase();

  // ESP32-S3 variants (check first since "ESP32-S3" contains "ESP32")
  if (normalized.startsWith('ESP32-S3')) {
    return 'ESP32-S3';
  }

  // Unsupported ESP32 variants (C-series, S2, H-series, P4)
  // These have different architectures and require separate firmware
  // Note: ESP32-PICO is an original ESP32 package, not ESP32-P4
  if (
    normalized.startsWith('ESP32-C') ||
    normalized.startsWith('ESP32-S2') ||
    normalized.startsWith('ESP32-H') ||
    normalized.startsWith('ESP32-P4')
  ) {
    return null;
  }

  // Original ESP32 variants (D0WD, D2WD, U4WDH, PICO, WROOM, etc.)
  if (normalized.startsWith('ESP32')) {
    return 'ESP32';
  }

  return null;
}

/**
 * Get the OTA firmware filename for a chip type
 */
export function getOtaFirmwareFilename(chipType: SupportedChip): string {
  const suffix = chipType.toLowerCase().replace('-', '');
  return `firmware-${suffix}.bin`;
}

