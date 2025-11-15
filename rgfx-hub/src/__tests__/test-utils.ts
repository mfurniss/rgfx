/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { writeFileSync, existsSync } from 'node:fs';
import {
  TEST_FILE_WATCHER_RETRY_DELAY_MS,
  TEST_FILE_WATCHER_MAX_RETRIES,
} from '../config/constants';

/**
 * Write to a file and retry until a watcher detects the change.
 *
 * This solves the fs.watch initialization race condition on macOS where
 * the watcher may not be ready immediately after calling watch().
 *
 * Strategy: Write a probe event to test if watcher is ready, then write actual data.
 * The probe event "rgfx/test ready" will be ignored by production code but triggers
 * a callback, allowing us to detect when fs.watch is initialized.
 *
 * @param filePath - Path to the file to write
 * @param data - Data to write (will be appended once)
 * @param expectedCalls - How many callback invocations we expect from this data
 * @param getActualCalls - Function that returns current number of calls
 * @param options - Configuration options
 */
export async function waitForFileWatcherReady(
  filePath: string,
  data: string,
  expectedCalls: number,
  getActualCalls: () => number,
  options: {
    retryDelayMs?: number;
    maxRetries?: number;
  } = {}
): Promise<void> {
  const {
    retryDelayMs = TEST_FILE_WATCHER_RETRY_DELAY_MS,
    maxRetries = TEST_FILE_WATCHER_MAX_RETRIES,
  } = options; // 2 seconds total

  // Ensure file exists before we start retrying (create if needed)
  if (!existsSync(filePath)) {
    writeFileSync(filePath, '');
  }

  const initialCalls = getActualCalls();

  // Phase 1: Probe with test event until watcher responds
  let probeCallCount = 0;

  for (let i = 0; i < maxRetries; i++) {
    const callsBefore = getActualCalls();

    // Write probe event (valid format, will trigger callback)
    writeFileSync(filePath, 'rgfx/test ready\n', { flag: 'a' });
    probeCallCount++;

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

    // If watcher called callback, it's ready - break out of the loop
    if (getActualCalls() > callsBefore) {
      break; // Stop immediately to avoid extra writes
    }

    // If we've exhausted all retries, watcher never became ready
    if (i === maxRetries - 1) {
      throw new Error(`File watcher did not initialize after ${maxRetries * retryDelayMs}ms`);
    }
  }

  // Phase 2: Write actual data once - watcher is ready
  writeFileSync(filePath, data, { flag: 'a' });

  // Phase 3: Wait for expected callbacks (including ALL probe writes)
  // We expect: probeCallCount callbacks + expectedCalls from actual data
  const targetCalls = initialCalls + probeCallCount + expectedCalls;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

    if (getActualCalls() >= targetCalls) {
      return;
    }
  }

  throw new Error(
    `File watcher did not process data after ${maxRetries * retryDelayMs}ms. ` +
      `Expected ${targetCalls} total calls, got ${getActualCalls()}`
  );
}
