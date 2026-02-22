import type { Driver } from '@/types';
import type { DriverFlashStatus } from '../store/ui-store';

export interface OtaFlashCallbacks {
  onLog: (message: string) => void;
  onDriverStatusChange: (driverId: string, status: DriverFlashStatus) => void;
}

export interface OtaFlashResult {
  successCount: number;
  totalCount: number;
  failedDrivers: string[];
}

/**
 * Flash a single driver via OTA
 * Returns the driver ID on success, throws on failure
 */
async function flashSingleDriver(
  driver: Driver,
  callbacks: OtaFlashCallbacks,
): Promise<string> {
  const { onLog, onDriverStatusChange } = callbacks;

  onDriverStatusChange(driver.id, { status: 'flashing', progress: 0 });

  try {
    await window.rgfx.flashOTA(driver.id);
    onDriverStatusChange(driver.id, { status: 'success', progress: 100 });
    onLog(`[${driver.id}] Firmware flashed successfully!`);
    return driver.id;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    onDriverStatusChange(driver.id, { status: 'error', progress: 0, error: errorMsg });
    onLog(`[${driver.id}] Flash failed: ${errorMsg}`);
    throw new Error(`${driver.id}: ${errorMsg}`);
  }
}

/**
 * Validate and filter drivers for OTA flashing
 */
export function getDriversToFlash(
  selectedDriverIds: Set<string>,
  allDrivers: Driver[],
): Driver[] {
  return Array.from(selectedDriverIds)
    .map((id) => allDrivers.find((d) => d.id === id))
    .filter((d): d is Driver => d?.state === 'connected');
}

/**
 * Format failed results from Promise.allSettled into error messages
 */
function formatFailedResults(
  failedResults: PromiseRejectedResult[],
): string[] {
  return failedResults.map((r) =>
    r.reason instanceof Error ? r.reason.message : String(r.reason),
  );
}

/**
 * Flash firmware to multiple drivers via OTA in parallel
 */
export async function flashViaOTA(
  driversToFlash: Driver[],
  firmwareVersion: string,
  callbacks: OtaFlashCallbacks,
): Promise<OtaFlashResult> {
  const { onLog, onDriverStatusChange } = callbacks;

  if (driversToFlash.length === 0) {
    throw new Error('No connected drivers selected');
  }

  // Initialize status for all drivers
  driversToFlash.forEach((d) => {
    onDriverStatusChange(d.id, { status: 'pending', progress: 0 });
  });

  onLog(`Firmware version: ${firmwareVersion}`);
  onLog(`Starting OTA flash to ${driversToFlash.length} driver(s) in parallel...`);
  driversToFlash.forEach((driver) => {
    onLog(`  - ${driver.id} (${driver.ip})`);
  });

  // Flash all drivers in parallel
  const results = await Promise.allSettled(
    driversToFlash.map((driver) => flashSingleDriver(driver, callbacks)),
  );

  // Process results
  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failedResults = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  );
  const failedDrivers = formatFailedResults(failedResults);

  return {
    successCount,
    totalCount: driversToFlash.length,
    failedDrivers,
  };
}

/**
 * Generate result message based on flash outcome
 */
export function generateResultMessage(
  result: OtaFlashResult,
  firmwareVersion: string,
): { success: boolean; message: string } {
  const { successCount, totalCount, failedDrivers } = result;

  const driverWord = (count: number) => (count === 1 ? 'driver' : 'drivers');

  if (failedDrivers.length === 0) {
    return {
      success: true,
      message: `Firmware v${firmwareVersion} flashed successfully to ${successCount} ${driverWord(successCount)}!`,
    };
  }

  if (successCount > 0) {
    const failedList = failedDrivers.join('\n');
    return {
      success: false,
      message: `Partial success: ${successCount} of ${totalCount} ${driverWord(totalCount)} flashed.\n\nFailed:\n${failedList}`,
    };
  }

  const failedList = failedDrivers.join('\n');
  return {
    success: false,
    message: `OTA flash failed for all drivers:\n${failedList}`,
  };
}
