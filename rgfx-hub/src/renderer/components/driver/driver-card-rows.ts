import type { InfoRowData } from '../common/info-section';
import type { Driver, DriverTelemetry, DriverLEDConfig, LEDHardware } from '@/types';
import {
  formatBytes,
  formatUptime,
  formatNumber,
  getSignalQuality,
} from '@/renderer/utils/formatters';

/**
 * Gets rotated dimensions for a panel based on rotation code.
 * Rotation codes: a=0°, b=90°, c=180°, d=270° (b and d swap width/height)
 */
export function getRotatedDimensions(
  panelWidth: number,
  panelHeight: number,
  rotation: string,
): { width: number; height: number } {
  const isRotated90or270 = rotation === 'b' || rotation === 'd';
  return isRotated90or270
    ? { width: panelHeight, height: panelWidth }
    : { width: panelWidth, height: panelHeight };
}

interface TelemetryRowsParams {
  driver: Driver;
  telemetry: DriverTelemetry | undefined;
  currentUptime: number;
  now: number;
}

/**
 * Builds telemetry info rows for the driver card.
 */
export function buildTelemetryRows({
  driver,
  telemetry,
  currentUptime,
  now,
}: TelemetryRowsParams): InfoRowData[] {
  return [
    ...(telemetry?.ledHealthy === false
      ? [['LED Health', 'RMT output failure detected'] as InfoRowData]
      : []),
    ...(telemetry
      ? [['Frame Rate', `${telemetry.currentFps.toFixed(1)} FPS (min: ${telemetry.minFps.toFixed(1)}, max: ${telemetry.maxFps.toFixed(1)})`] as InfoRowData]
      : []),
    ...(telemetry?.frameTiming
      ? [[
        'Frame Timing',
        [
          `clear: ${formatNumber(telemetry.frameTiming.clearUs)}µs`,
          `effects: ${formatNumber(telemetry.frameTiming.effectsUs)}µs`,
          `downsample: ${formatNumber(telemetry.frameTiming.downsampleUs)}µs`,
          `show: ${formatNumber(telemetry.frameTiming.showUs)}µs`,
          `total: ${formatNumber(telemetry.frameTiming.totalUs)}µs`,
        ].join('\n'),
      ] as InfoRowData]
      : []),
    ...(telemetry?.lastResetReason
      ? [['Last Reset Reason', telemetry.lastResetReason] as InfoRowData]
      : []),
    ...(telemetry?.crashCount !== undefined && telemetry.crashCount > 0
      ? [['Crash Count', formatNumber(telemetry.crashCount)] as InfoRowData]
      : []),
    ...(telemetry ? [['Driver Uptime', formatUptime(Math.max(0, currentUptime))] as InfoRowData] : []),
    ...(driver.freeHeap !== undefined && driver.minFreeHeap !== undefined
      ? [['Memory', `${formatBytes(driver.freeHeap)} free (min: ${formatBytes(driver.minFreeHeap)})`] as InfoRowData]
      : []),
    ...(telemetry
      ? [
        ['Free Heap', `${formatBytes(driver.freeHeap ?? 0)} / ${formatBytes(telemetry.heapSize)}`] as InfoRowData,
        ['Max Allocatable Heap', formatBytes(telemetry.maxAllocHeap)] as InfoRowData,
        ...(telemetry.psramSize > 0
          ? [['Free PSRAM', `${formatBytes(telemetry.freePsram)} / ${formatBytes(telemetry.psramSize)}`] as InfoRowData]
          : []),
        ['Sketch Size', formatBytes(telemetry.sketchSize)] as InfoRowData,
        ['Free Sketch Space', formatBytes(telemetry.freeSketchSpace)] as InfoRowData,
        ['SDK Version', telemetry.sdkVersion] as InfoRowData,
      ]
      : []),
    ...(driver.rssi !== undefined
      ? [['WiFi Signal', `${formatNumber(driver.rssi)} dBm (${getSignalQuality(driver.rssi)})`] as InfoRowData]
      : []),
    ...(driver.uptimeMs !== undefined
      ? [['Uptime', formatUptime(driver.uptimeMs)] as InfoRowData]
      : []),
    ['Telemetry Events', formatNumber(driver.stats.telemetryEventsReceived)],
    ['MQTT Messages Received', formatNumber(driver.stats.mqttMessagesReceived)],
    ['MQTT Errors', formatNumber(driver.stats.mqttMessagesFailed)],
    ...(driver.lastHeartbeat
      ? [['Last Updated', `${Math.floor(Math.abs(now - driver.lastHeartbeat) / 1000)}s ago`] as InfoRowData]
      : []),
  ];
}

interface HardwareRowsParams {
  driver: Driver;
  telemetry: DriverTelemetry | undefined;
}

/**
 * Builds hardware info rows for the driver card.
 */
export function buildHardwareRows({ driver, telemetry }: HardwareRowsParams): InfoRowData[] {
  if (!telemetry) {
    return [];
  }

  return [
    ['IP Address', driver.ip ?? ''],
    ['MAC Address', driver.mac ?? ''],
    ['Hostname', driver.hostname ?? ''],
    ['SSID', driver.ssid ?? ''],
    ['Chip Model', telemetry.chipModel],
    ['Chip Revision', formatNumber(telemetry.chipRevision)],
    ['CPU Cores', formatNumber(telemetry.chipCores)],
    ['CPU Frequency', `${formatNumber(telemetry.cpuFreqMHz)} MHz`],
    ['Flash Size', formatBytes(telemetry.flashSize)],
    ['Flash Speed', `${formatNumber(telemetry.flashSpeed / 1000000)} MHz`],
    ...(telemetry.firmwareVersion
      ? [['Firmware Version', telemetry.firmwareVersion] as InfoRowData]
      : []),
  ];
}

interface LedHardwareRowsParams {
  hardware: LEDHardware | undefined;
  hardwareFilename: string;
}

/**
 * Builds LED hardware info rows for the driver card.
 */
export function buildLedHardwareRows({
  hardware,
  hardwareFilename,
}: LedHardwareRowsParams): InfoRowData[] {
  if (!hardware) {
    return [];
  }

  return [
    ['Filename', hardwareFilename],
    ['Description', hardware.description ?? 'Not set'],
    ['SKU', hardware.sku ?? 'Not set'],
    ...(hardware.asin ? [['ASIN', hardware.asin] as InfoRowData] : []),
    ['Layout', hardware.layout],
    ['LED Count', formatNumber(hardware.count)],
    ...(hardware.layout !== 'strip'
      ? [['Panel Size', `${formatNumber(hardware.width ?? 0)} × ${formatNumber(hardware.height ?? 0)}`] as InfoRowData]
      : []),
    ['Chipset', hardware.chipset ?? 'Unknown'],
    ['Color Order', hardware.colorOrder ?? 'Unknown'],
  ];
}

interface LedConfigRowsParams {
  ledConfig: DriverLEDConfig | null | undefined;
  hardware: LEDHardware | undefined;
  actualWidth: number;
  actualHeight: number;
}

/**
 * Builds LED configuration info rows for the driver card.
 */
export function buildLedConfigRows({
  ledConfig,
  hardware,
  actualWidth,
  actualHeight,
}: LedConfigRowsParams): InfoRowData[] {
  if (!ledConfig) {
    return [];
  }

  return [
    ['Data Pin', formatNumber(ledConfig.pin)],
    ...(hardware && hardware.layout !== 'strip'
      ? [
        ['Actual Dimensions', `${formatNumber(actualWidth)} × ${formatNumber(actualHeight)}`] as InfoRowData,
        ['Total LED Count', formatNumber(actualWidth * actualHeight)] as InfoRowData,
      ]
      : []),
    ['Max Brightness', ledConfig.maxBrightness != null ? formatNumber(ledConfig.maxBrightness) : 'Not set'],
    ['Brightness Limit', ledConfig.globalBrightnessLimit != null ? formatNumber(ledConfig.globalBrightnessLimit) : 'Not set'],
    ['Dithering', ledConfig.dithering ? 'Yes' : 'No'],
    ['Gamma Correction', `R: ${ledConfig.gamma.r ?? 2.8}, G: ${ledConfig.gamma.g ?? 2.8}, B: ${ledConfig.gamma.b ?? 2.8}`],
    ...(ledConfig.floor.r > 0 || ledConfig.floor.g > 0 || ledConfig.floor.b > 0
      ? [['Floor Cutoff', `R: ${ledConfig.floor.r}, G: ${ledConfig.floor.g}, B: ${ledConfig.floor.b}`] as InfoRowData]
      : []),
    ...(ledConfig.unified
      ? [['Multi-Panel Layout', `${ledConfig.unified.length} ${ledConfig.unified.length === 1 ? 'row' : 'rows'} × ${ledConfig.unified[0]?.length ?? 0} ${(ledConfig.unified[0]?.length ?? 0) === 1 ? 'col' : 'cols'} (${ledConfig.unified.length * (ledConfig.unified[0]?.length ?? 0)} ${ledConfig.unified.length * (ledConfig.unified[0]?.length ?? 0) === 1 ? 'panel' : 'panels'})`] as InfoRowData]
      : []),
    ...(ledConfig.rotation && ledConfig.rotation !== '0' && !ledConfig.unified
      ? [['Panel Rotation', `${ledConfig.rotation}°`] as InfoRowData]
      : []),
    ['LED Offset', formatNumber(ledConfig.offset ?? 0)],
    ['Reverse Direction', ledConfig.reverse ? 'Yes' : 'No'],
    ...(ledConfig.powerSupplyVolts != null
      ? [['Power Supply', `${ledConfig.powerSupplyVolts}V`] as InfoRowData]
      : []),
    ...(ledConfig.maxPowerMilliamps != null
      ? [['Max Power', `${formatNumber(ledConfig.maxPowerMilliamps)} mA`] as InfoRowData]
      : []),
  ];
}

/**
 * Builds driver status info rows for the driver card.
 */
export function buildDriverStatusRows(driver: Driver): InfoRowData[] {
  return [
    ...(driver.description
      ? [['Description', driver.description] as InfoRowData]
      : []),
    ['Status', driver.disabled ? 'Disabled' : 'Enabled'],
    ...(driver.remoteLogging
      ? [['Remote Logging', driver.remoteLogging === 'all' ? 'All Messages' : driver.remoteLogging === 'errors' ? 'Errors Only' : 'Off'] as InfoRowData]
      : []),
    ...(driver.updateRate !== undefined
      ? [['Update Rate', `${formatNumber(driver.updateRate)} Hz`] as InfoRowData]
      : []),
    ...(driver.failedHeartbeats > 0
      ? [['Failed Heartbeats', formatNumber(driver.failedHeartbeats)] as InfoRowData]
      : []),
  ];
}
