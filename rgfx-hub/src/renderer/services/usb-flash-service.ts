import {
  FirmwareManifestSchema,
  type FirmwareManifest,
  type FirmwareFile as ManifestFile,
  type SupportedChip,
  mapChipNameToVariant,
} from '@/schemas';
import { sha256 } from '../utils/binary';
import {
  createEspLoader,
  type EspLoaderApi,
  type FlashLogger,
} from './esp-loader-factory';

export interface FlashCallbacks {
  onLog: (message: string) => void;
  onProgress: (percent: number) => void;
}

const MAX_CONNECT_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

interface FlashResult {
  success: boolean;
  firmwareVersion: string;
  chipType?: string;
  error?: string;
}

interface FirmwareFileData {
  data: ArrayBuffer;
  address: number;
  name: string;
  size: number;
}

/**
 * Load and verify firmware manifest from main process
 */
async function loadFirmwareManifest(onLog: (message: string) => void): Promise<FirmwareManifest> {
  onLog('Loading firmware manifest...');
  const manifestJson: unknown = await window.rgfx.getFirmwareManifest();
  const manifestResult = FirmwareManifestSchema.safeParse(manifestJson);

  if (!manifestResult.success) {
    throw new Error(`Invalid firmware manifest: ${manifestResult.error.message}`);
  }

  const manifest = manifestResult.data;
  const variantCount = Object.keys(manifest.variants).length;
  onLog(`Available variants: ${Object.keys(manifest.variants).join(', ')} (${variantCount})`);

  return manifest;
}

/**
 * Get firmware files for a specific chip variant from manifest
 */
function getVariantFiles(manifest: FirmwareManifest, chipType: SupportedChip): ManifestFile[] {
  const variant = manifest.variants[chipType];

  // Defensive check for manifest integrity
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!variant) {
    const available = Object.keys(manifest.variants).join(', ');
    throw new Error(`No firmware available for ${chipType}. Available: ${available}`);
  }
  return variant.files;
}

/**
 * Load and verify all firmware files for a specific chip variant
 */
async function loadAndVerifyFirmwareFiles(
  files: ManifestFile[],
  onLog: (message: string) => void,
): Promise<FirmwareFileData[]> {
  onLog('Loading and verifying firmware files...');
  const fileArray: FirmwareFileData[] = [];

  for (const fileInfo of files) {
    // Load firmware file via IPC (returns Node.js Buffer)
    const nodeBuffer = await window.rgfx.getFirmwareFile(fileInfo.name);
    // Convert Node.js Buffer to Uint8Array then to ArrayBuffer
    const uint8Array = new Uint8Array(nodeBuffer);
    const { buffer } = uint8Array;

    // Verify size
    if (buffer.byteLength !== fileInfo.size) {
      throw new Error(
        `Size mismatch for ${fileInfo.name}: expected ${fileInfo.size}, got ${buffer.byteLength}`,
      );
    }

    // Verify checksum
    const checksum = await sha256(buffer);

    if (checksum !== fileInfo.sha256) {
      throw new Error(
        `Checksum mismatch for ${fileInfo.name}: expected ${fileInfo.sha256.substring(0, 16)}..., got ${checksum.substring(0, 16)}...`,
      );
    }

    onLog(`  ✓ ${fileInfo.name} (${fileInfo.size} bytes, checksum verified)`);

    fileArray.push({
      data: buffer,
      address: fileInfo.address,
      name: fileInfo.name,
      size: fileInfo.size,
    });
  }

  onLog('All files verified successfully');
  return fileArray;
}

/**
 * Create a Logger adapter for the tasmota-webserial-esptool library.
 * Only suppresses raw hex dumps and byte-level trace data.
 */
function createLogger(onLog: (message: string) => void): FlashLogger {
  const isHexDump = (msg: string): boolean =>
    /^\s*[0-9a-f]{16}\s+[0-9a-f]{16}\s+\|/.test(msg);

  return {
    log(msg: string) {
      if (!isHexDump(msg)) {
        onLog(msg);
      }
    },
    error(msg: string) {
      onLog(`Error: ${msg}`);
    },
    debug(msg: string) {
      if (!isHexDump(msg)) {
        onLog(msg);
      }
    },
  };
}

/**
 * Connect to ESP32 with automatic retry on sync/timeout failures.
 * USB-UART bridges (CP2102, CH340) can have indeterminate DTR/RTS states
 * on first open, causing bootloader entry to fail. Disconnecting resets
 * the signal state, so a retry typically succeeds.
 */
async function connectWithRetry(
  getPort: () => Promise<SerialPort>,
  logger: FlashLogger,
  onLog: (message: string) => void,
): Promise<EspLoaderApi> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
    let loader: EspLoaderApi | undefined;

    try {
      const port = await getPort();
      onLog(attempt === 1 ? 'Connecting to device...' : `Retry ${attempt}/${MAX_CONNECT_ATTEMPTS}...`);
      loader = await createEspLoader(port, logger);
      await loader.initialize();

      return loader;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry on sync/timeout errors
      const msg = lastError.message.toLowerCase();
      const isSyncError = msg.includes('sync') || msg.includes('timeout');

      if (!isSyncError || attempt === MAX_CONNECT_ATTEMPTS) {
        throw lastError;
      }

      onLog(`Connection attempt ${attempt} failed: ${lastError.message}`);

      // Clean up before retry
      try {
        if (loader) {
          await loader.disconnect();
        }
      } catch {
        // Ignore disconnect errors during retry cleanup
      }

      onLog(`Waiting ${RETRY_DELAY_MS}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw lastError ?? new Error('Connection failed');
}

/**
 * Flash firmware to ESP32 via USB serial.
 * Uses tasmota-webserial-esptool which handles multi-strategy bootloader
 * entry (UnixTight, Classic, inverted variants) for cross-platform reliability.
 */
export async function flashViaUSB(
  getPort: () => Promise<SerialPort>,
  callbacks: FlashCallbacks,
): Promise<FlashResult> {
  const { onLog, onProgress } = callbacks;
  let loader: EspLoaderApi | undefined;

  try {
    onProgress(0);

    // Load manifest first to check available variants
    const manifest = await loadFirmwareManifest(onLog);

    const logger = createLogger(onLog);
    loader = await connectWithRetry(getPort, logger, onLog);

    const chipName = loader.chipName ?? 'Unknown';
    onLog(`Connected to ${chipName}`);

    // Map detected chip to supported variant
    const chipType = mapChipNameToVariant(chipName);

    if (!chipType) {
      throw new Error(
        `Unsupported chip type: ${chipName}. Supported: ESP32, ESP32-S3`,
      );
    }
    onLog(`Detected chip type: ${chipType}`);

    // Get firmware files for detected chip
    const variant = manifest.variants[chipType];
    const variantFiles = getVariantFiles(manifest, chipType);
    onLog(`Loading ${chipType} firmware v${variant.version} (${variantFiles.length} files)...`);

    // Load and verify firmware files for this chip
    const fileArray = await loadAndVerifyFirmwareFiles(variantFiles, onLog);

    // Upload stub for faster flashing and erase support
    onLog('Loading flasher stub...');
    const stub = await loader.runStub();

    // Erase the otadata partition so the bootloader defaults to app0 (ota_0).
    // Without this, a device previously updated via ArduinoOTA boots from app1,
    // ignoring the firmware we just wrote to app0 at 0x10000.
    const OTADATA_OFFSET = 0xe000;
    const OTADATA_SIZE = 0x2000; // 8KB
    onLog('Erasing OTA data partition (resetting boot selection)...');
    const emptyOtaData = new ArrayBuffer(OTADATA_SIZE);
    new Uint8Array(emptyOtaData).fill(0xff);
    const noop = (): void => { /* no progress needed */ };
    await stub.flashData(emptyOtaData, noop, OTADATA_OFFSET, true);

    // Calculate total size for progress reporting
    const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
    let totalWritten = 0;
    let lastLoggedPct = 0;

    // Flash each firmware file
    onLog('Starting flash operation...');

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileBaseWritten = totalWritten;
      onLog(`Flashing ${file.name} at 0x${file.address.toString(16)}...`);

      await stub.flashData(
        file.data,
        (bytesWritten: number) => {
          const overallWritten = fileBaseWritten + bytesWritten;
          totalWritten = overallWritten;
          const progressPct = Math.round(
            (overallWritten / totalSize) * 100,
          );
          onProgress(progressPct);

          if (progressPct > lastLoggedPct && progressPct < 100) {
            lastLoggedPct = progressPct;
            const kb = Math.round(overallWritten / 1024);
            const totalKb = Math.round(totalSize / 1024);
            onLog(`  ${progressPct}% (${kb}/${totalKb} KB)`);
          }
        },
        file.address,
        true,
      );

      onLog(`File ${i + 1}/${fileArray.length} complete`);
    }

    onLog('Flash complete!');

    // Reset device to run the new firmware
    onLog('Resetting device...');
    await loader.hardResetToFirmware();
    onLog('Device reset complete');

    onLog(`Firmware v${variant.version} (${chipType}) flashed successfully!`);
    onProgress(100);

    return {
      success: true,
      firmwareVersion: variant.version,
      chipType,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    onLog(`Error: ${errorMessage}`);
    return {
      success: false,
      firmwareVersion: '',
      error: errorMessage,
    };
  } finally {
    try {
      if (loader) {
        await loader.disconnect();
      }
    } catch {
      // Ignore disconnect errors
    }
  }
}
