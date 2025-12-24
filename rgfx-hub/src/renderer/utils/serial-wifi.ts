/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * Send WiFi credentials to ESP32 via serial port.
 *
 * Usage from DevTools console:
 *   1. Select a port using the SerialPortSelector on the Firmware page
 *   2. Run: await sendWifiCommand(getPort, 'MySSID', 'MyPassword')
 *
 * Or request a new port directly:
 *   const port = await navigator.serial.requestPort();
 *   await sendWifiCommandToPort(port, 'MySSID', 'MyPassword');
 */

export interface SendWifiResult {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * Format WiFi credentials for the serial command.
 * Handles quoting for SSIDs/passwords with spaces.
 */
function formatWifiCommand(ssid: string, password: string): string {
  const needsQuotedSsid = ssid.includes(' ');
  const needsQuotedPassword = password.includes(' ');

  const formattedSsid = needsQuotedSsid ? `"${ssid}"` : ssid;
  const formattedPassword = needsQuotedPassword ? `"${password}"` : password;

  return `wifi ${formattedSsid} ${formattedPassword}\n`;
}

/**
 * Send WiFi command to an already-opened serial port.
 */
export async function sendWifiCommandToPort(
  port: SerialPort,
  ssid: string,
  password: string,
  log: (msg: string) => void = console.log,
): Promise<SendWifiResult> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  try {
    // Open port if not already open
    if (!port.readable || !port.writable) {
      log('Opening serial port at 115200 baud...');
      await port.open({ baudRate: 115200 });
    }

    if (!port.writable) {
      throw new Error('Port is not writable');
    }

    // Get writer
    writer = port.writable.getWriter();

    // Format and send command
    const command = formatWifiCommand(ssid, password);
    log(`Sending: wifi ${ssid} ${password}`);

    const encoder = new TextEncoder();
    await writer.write(encoder.encode(command));

    log('Command sent, waiting for response...');

    // Release writer before reading
    writer.releaseLock();
    writer = null;

    // Read response (with timeout)
    if (!port.readable) {
      throw new Error('Port is not readable');
    }

    reader = port.readable.getReader();
    const decoder = new TextDecoder();
    let response = '';
    const startTime = Date.now();
    const timeout = 3000; // 3 seconds

    while (Date.now() - startTime < timeout) {
      // Read with timeout
      const readPromise = reader.read();
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 100);
      });

      const result = await Promise.race([readPromise, timeoutPromise]);

      // Timeout occurred
      if (result === null) {
        if (response.includes('Restart') || response.includes('ERROR')) {
          break;
        }
        continue;
      }

      // Stream ended
      if (result.done) {
        break;
      }

      const { value } = result;
      response += decoder.decode(value, { stream: true });
      log(`Received: ${decoder.decode(value).trim()}`);

      // Check for success/failure indicators
      if (response.includes('Restarting') || response.includes('saved successfully')) {
        log('WiFi credentials saved! Device will restart.');
        break;
      }

      if (response.includes('ERROR')) {
        throw new Error(`Device error: ${response}`);
      }
    }

    reader.releaseLock();
    reader = null;

    return { success: true, response };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log(`Error: ${message}`);
    return { success: false, error: message };
  } finally {
    // Clean up
    if (reader) {
      try {
        reader.releaseLock();
      } catch {
        // Ignore
      }
    }

    if (writer) {
      try {
        writer.releaseLock();
      } catch {
        // Ignore
      }
    }

    // Close port
    try {
      if (port.readable || port.writable) {
        log('Closing serial port...');
        await port.close();
        log('Port closed');
      }
    } catch {
      // Ignore close errors
    }
  }
}

/**
 * Send WiFi command using a port getter function (from SerialPortSelector).
 */
export async function sendWifiCommand(
  getPort: () => Promise<SerialPort>,
  ssid: string,
  password: string,
  log: (msg: string) => void = console.log,
): Promise<SendWifiResult> {
  try {
    log('Getting serial port...');
    const port = await getPort();
    return await sendWifiCommandToPort(port, ssid, password, log);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log(`Error getting port: ${message}`);
    return { success: false, error: message };
  }
}

// Expose to window for DevTools testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).sendWifiCommand = sendWifiCommand;
  (window as unknown as Record<string, unknown>).sendWifiCommandToPort = sendWifiCommandToPort;
}
