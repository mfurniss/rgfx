import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { MqttBroker } from '../network';
import { INVOKE_CHANNELS } from './contract';
import { eventBus } from '../services/event-bus';
import { addActiveOtaDriver, removeActiveOtaDriver } from '../services/global-error-handler';
import {
  type SupportedChip,
  getOtaFirmwareFilename,
  mapChipNameToVariant,
} from '../schemas/firmware-manifest';
import { getFirmwareFilePath } from '../utils/firmware-paths';
import { getLocalIP } from '../network/network-utils';

const OTA_TIMEOUT_MS = 120_000;
const FIRST_CONTACT_TIMEOUT_MS = 15_000;

interface FlashOtaHandlerDeps {
  driverRegistry: DriverRegistry;
  mqtt: MqttBroker;
}

function getChipType(chipModel: string | undefined): SupportedChip {
  if (!chipModel) {
    throw new Error(
      'Driver chip type unknown. Cannot determine correct firmware. ' +
      'The driver may be running old firmware that does not report chip type.',
    );
  }

  const chipType = mapChipNameToVariant(chipModel);

  if (!chipType) {
    throw new Error(
      `Unsupported chip type: ${chipModel}. Supported: ESP32, ESP32-S3`,
    );
  }

  return chipType;
}

function getFirmwarePath(chipType: SupportedChip): string {
  return getFirmwareFilePath(getOtaFirmwareFilename(chipType));
}

function calculateMd5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
    stream.on('error', reject);
  });
}

function createFirmwareServer(
  firmwarePath: string,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/firmware.bin') {
        const stat = fs.statSync(firmwarePath);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': stat.size,
        });
        fs.createReadStream(firmwarePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, () => {
      const addr = server.address();

      if (addr && typeof addr === 'object') {
        resolve({ server, port: addr.port });
      } else {
        server.close();
        reject(new Error('Failed to get server port'));
      }
    });

    server.on('error', reject);
  });
}

function markDriverDisconnected(driverRegistry: DriverRegistry, driverId: string): void {
  const driver = driverRegistry.getDriver(driverId);

  if (driver) {
    driver.state = 'disconnected';
    driver.ip = undefined;
    eventBus.emit('driver:disconnected', { driver, reason: 'restarting' });
  }
}

export function registerFlashOtaHandler(deps: FlashOtaHandlerDeps): void {
  const { driverRegistry, mqtt } = deps;

  ipcMain.handle(INVOKE_CHANNELS.flashOTA, async (_event, driverId: string): Promise<void> => {
    const driver = driverRegistry.getDriver(driverId);

    if (!driver) {
      throw new Error('Driver not found');
    }

    if (driver.state !== 'connected') {
      throw new Error('Driver is not connected');
    }

    if (!driver.ip) {
      throw new Error('Driver IP address not available');
    }

    if (!driver.mac) {
      throw new Error('Driver MAC address not available — cannot send MQTT OTA command');
    }

    const chipType = getChipType(driver.telemetry?.chipModel);
    const firmwarePath = getFirmwarePath(chipType);

    if (!fs.existsSync(firmwarePath)) {
      throw new Error(`Firmware file not found for ${chipType}: ${firmwarePath}`);
    }

    log.info(`Starting MQTT OTA flash to ${driverId} (${driver.ip}), chip: ${chipType}...`);

    addActiveOtaDriver(driverId);
    driver.state = 'updating';
    eventBus.emit('driver:updated', { driver });
    driverRegistry.touchDriver(driverId);

    const [md5, firmwareStat] = await Promise.all([
      calculateMd5(firmwarePath),
      fs.promises.stat(firmwarePath),
    ]);

    const { server, port } = await createFirmwareServer(firmwarePath);
    const hubIP = getLocalIP();
    const firmwareUrl = `http://${hubIP}:${port}/firmware.bin`;

    const progressTopic = `rgfx/driver/${driverId}/ota/progress`;
    const resultTopic = `rgfx/driver/${driverId}/ota/result`;
    const commandTopic = `rgfx/driver/${driver.mac}/ota`;

    let lastPercent = -1;

    try {
      const result = await new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // If progress was near-complete, device likely rebooted before sending result
          if (lastPercent >= 95) {
            log.info(`OTA to ${driverId} likely succeeded (${lastPercent}% complete, device rebooted)`);
            resolve({ success: true });
          } else {
            reject(new Error(`OTA timeout after ${OTA_TIMEOUT_MS / 1000}s (last progress: ${lastPercent}%)`));
          }
        }, OTA_TIMEOUT_MS);

        // Fail fast if the driver never responds — likely running old firmware without MQTT OTA
        const firstContactTimeout = setTimeout(() => {
          if (lastPercent === -1) {
            clearTimeout(timeout);
            reject(new Error(
              'Driver did not respond to OTA command within 15 seconds. ' +
              'The driver firmware may not support MQTT OTA — please update via USB Serial first.',
            ));
          }
        }, FIRST_CONTACT_TIMEOUT_MS);

        mqtt.subscribe(progressTopic, (_topic, payload) => {
          try {
            const data = JSON.parse(payload) as { percent: number };
            const {percent} = data;

            if (percent !== lastPercent) {
              clearTimeout(firstContactTimeout);
              log.info(`OTA progress: ${driverId} ${percent}%`);
              lastPercent = percent;

              driverRegistry.touchDriver(driverId);

              eventBus.emit('flash:ota:progress', {
                driverId,
                sent: Math.round((percent / 100) * firmwareStat.size),
                total: firmwareStat.size,
                percent,
              });

              eventBus.emit('flash:ota:state', {
                driverId,
                state: `downloading: ${percent}%`,
              });
            }
          } catch {
            log.warn(`Invalid OTA progress payload from ${driverId}: ${payload}`);
          }
        });

        mqtt.subscribe(resultTopic, (_topic, payload) => {
          clearTimeout(firstContactTimeout);
          clearTimeout(timeout);

          try {
            const data = JSON.parse(payload) as { success: boolean; error?: string };
            resolve(data);
          } catch {
            reject(new Error(`Invalid OTA result payload: ${payload}`));
          }
        });

        // Send OTA command to ESP32
        const otaPayload = JSON.stringify({
          url: firmwareUrl,
          size: firmwareStat.size,
          md5,
        });

        log.info(`Publishing OTA command to ${commandTopic}: ${otaPayload}`);

        mqtt.publish(commandTopic, otaPayload).catch((err: unknown) => {
          clearTimeout(timeout);
          const message = err instanceof Error
            ? err.message : String(err);

          reject(new Error(
            `Failed to publish OTA command: ${message}`,
          ));
        });
      });

      if (result.success) {
        log.info(`OTA flash to ${driverId} (${chipType}) completed successfully`);
        markDriverDisconnected(driverRegistry, driverId);
      } else {
        throw new Error(result.error ?? 'OTA failed on device');
      }
    } catch (error) {
      const errorDriver = driverRegistry.getDriver(driverId);

      if (errorDriver) {
        errorDriver.state = 'disconnected';
        eventBus.emit('driver:updated', { driver: errorDriver });
      }
      throw error;
    } finally {
      mqtt.unsubscribe(progressTopic);
      mqtt.unsubscribe(resultTopic);
      removeActiveOtaDriver(driverId);
      server.close();
    }
  });
}
