/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ESPLoader, Transport } from 'esptool-js';
import { FirmwareManifestSchema, type FirmwareManifest } from '@/schemas';
import { arrayBufferToBinaryString, sha256 } from '../utils/binary';

export interface FlashCallbacks {
  onLog: (message: string) => void;
  onProgress: (percent: number) => void;
}

interface FlashResult {
  success: boolean;
  firmwareVersion: string;
  error?: string;
}

interface FirmwareFile {
  data: string;
  address: number;
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
  onLog(`Firmware version: ${manifest.version}`);
  onLog(`Files to flash: ${manifest.files.length}`);

  return manifest;
}

/**
 * Load and verify all firmware files defined in manifest
 */
async function loadAndVerifyFirmwareFiles(
  manifest: FirmwareManifest,
  onLog: (message: string) => void,
): Promise<FirmwareFile[]> {
  onLog('Loading and verifying firmware files...');
  const fileArray: FirmwareFile[] = [];

  for (const fileInfo of manifest.files) {
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

    // Convert to binary string for esptool-js
    const binaryString = arrayBufferToBinaryString(buffer);
    fileArray.push({
      data: binaryString,
      address: fileInfo.address,
    });
  }

  onLog('All files verified successfully');
  return fileArray;
}

/**
 * Find the index of the largest file (app binary) for progress reporting
 */
function findLargestFileIndex(fileArray: FirmwareFile[]): number {
  return fileArray.reduce(
    (maxIdx, file, idx, arr) => (file.data.length > arr[maxIdx].data.length ? idx : maxIdx),
    0,
  );
}

/**
 * Create ESPLoader terminal that filters verbose logs
 */
function createFilteredTerminal(onLog: (message: string) => void) {
  const isVerboseLog = (data: string): boolean =>
    data.startsWith('TRACE') ||
    data.startsWith('Write bytes') ||
    data.includes('bytes:') ||
    /^\s*[0-9a-f]{16}\s+[0-9a-f]{16}\s+\|/.test(data); // hex dump lines

  return {
    clean() {
      // Terminal clean
    },
    writeLine(data: string) {
      if (!isVerboseLog(data)) {
        onLog(data);
      }
    },
    write(data: string) {
      if (!isVerboseLog(data)) {
        onLog(data);
      }
    },
  };
}

/**
 * Reset ESP32 device using RTS signal
 * RTS is active-low and connected to EN via transistor circuit
 */
async function resetDevice(port: SerialPort, onLog: (message: string) => void): Promise<void> {
  onLog('Resetting device...');
  // Setting RTS true (active) pulls EN low (chip in reset)
  await port.setSignals({ requestToSend: true });
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Setting RTS false (inactive) releases EN high (chip boots)
  await port.setSignals({ requestToSend: false });
  await new Promise((resolve) => setTimeout(resolve, 50));
  onLog('Device reset complete');
}

/**
 * Clean up transport and port resources
 */
async function cleanupResources(
  transport: Transport | null,
  port: SerialPort | undefined,
  onLog: (message: string) => void,
): Promise<void> {
  try {
    if (transport) {
      onLog('Disconnecting transport...');
      await transport.disconnect();
    }
  } catch {
    // Ignore disconnect errors
  }

  try {
    if (port) {
      // Check if port is still open before closing
      if (port.readable || port.writable) {
        onLog('Closing serial port...');
        await port.close();
        onLog('Serial port closed');
      }
    }
  } catch {
    // Ignore close errors
  }
}

/**
 * Flash firmware to ESP32 via USB serial
 */
export async function flashViaUSB(
  getPort: () => Promise<SerialPort>,
  callbacks: FlashCallbacks,
): Promise<FlashResult> {
  const { onLog, onProgress } = callbacks;
  let portToFlash: SerialPort | undefined;
  let transport: Transport | null = null;

  try {
    onProgress(0);

    // Load and verify firmware
    const manifest = await loadFirmwareManifest(onLog);
    const fileArray = await loadAndVerifyFirmwareFiles(manifest, onLog);
    const largestFileIndex = findLargestFileIndex(fileArray);

    // Get fresh, clean port from selector
    portToFlash = await getPort();

    onLog('Initializing ESP loader (will open port)...');
    transport = new Transport(portToFlash, true);

    const loader = new ESPLoader({
      transport,
      baudrate: 921600,
      romBaudrate: 115200,
      terminal: createFilteredTerminal(onLog),
    });

    onLog('Connecting to device...');
    const chip = await loader.main();
    onLog(`Connected to ${chip}`);

    onLog('Starting flash operation...');
    await loader.writeFlash({
      fileArray,
      flashSize: 'keep',
      flashMode: 'dio',
      flashFreq: '40m',
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        // Only report progress for the largest file (app binary)
        if (fileIndex === largestFileIndex) {
          const progressPct = (written / total) * 100;
          onProgress(Math.round(progressPct));
        }

        if (written === total) {
          onLog(`File ${fileIndex + 1}/${fileArray.length} complete`);
        }
      },
    });

    onLog('Flash complete!');

    // Reset the device
    await resetDevice(portToFlash, onLog);

    onLog('Firmware flashed successfully via USB!');
    onProgress(100);

    return {
      success: true,
      firmwareVersion: manifest.version,
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
    await cleanupResources(transport, portToFlash, onLog);
  }
}
