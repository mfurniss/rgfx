import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, Typography, Box, IconButton, Alert, Stack } from '@mui/material';
import SuperButton from '../common/super-button';
import DriverState from './driver-state';
import {
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  Sensors as SensorsIcon,
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import type { Driver } from '@/types';
import InfoSection, { type InfoRowData } from '../common/info-section';
import TestLedButton from './test-led-button';
import ResetDriverButton from './reset-driver-button';
import RestartDriverButton from './restart-driver-button';
import DisableDriverButton from './disable-driver-button';
import DeleteDriverButton from './delete-driver-button';
import TelemetryCharts from '../charts/telemetry-charts';
import { formatBytes, formatUptime, formatNumber } from '../../utils/formatters';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '@/config/constants';
import { useDriverStore } from '../../store/driver-store';

interface DriverCardProps {
  driver: Driver;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { telemetry } = driver;
  const [now, setNow] = useState(Date.now());
  const { currentFirmwareVersion } = useDriverStore((state) => state.systemStatus);

  // Update every second for live timestamps and uptime - only when component is visible
  useEffect(() => {
    // Check if we're on a driver detail page (/drivers/:id)
    const isVisible = location.pathname.startsWith('/drivers/');

    if (isVisible) {
      // Immediate update when page becomes visible
      setNow(Date.now());

      // Then start interval
      const interval = setInterval(() => {
        setNow(Date.now());
      }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

      return () => {
        clearInterval(interval);
      };
    }
  }, [location.pathname]);

  // Helper function to determine WiFi signal quality
  const getSignalQuality = (rssi: number): string => {
    if (rssi >= -50) {
      return 'Excellent';
    }

    if (rssi >= -60) {
      return 'Good';
    }

    if (rssi >= -70) {
      return 'Fair';
    }

    return 'Poor';
  };

  // Calculate current uptime based on initial uptimeMs from driver
  // Only available when telemetry is present
  const driverUptimeAtSnapshot = driver.uptimeMs ?? 0;
  const timeOfSnapshot = driver.lastSeen;
  const timeSinceSnapshot = now - timeOfSnapshot;
  const currentUptime =
    driver.state === 'connected' && telemetry
      ? driverUptimeAtSnapshot + timeSinceSnapshot
      : driverUptimeAtSnapshot;

  // Prepare data arrays for InfoSection components
  // Driver telemetry from periodic heartbeats - always show if any data available
  const telemetryRows: InfoRowData[] = [
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
        ...(telemetry.psramSize > 0
          ? [['Free PSRAM', `${formatBytes(telemetry.freePsram)} / ${formatBytes(telemetry.psramSize)}`] as InfoRowData]
          : []),
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

  const hardwareRows: InfoRowData[] = telemetry
    ? [
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
      ['Display Connected', telemetry.hasDisplay ? 'Yes (OLED)' : 'No'],
      ...(telemetry.firmwareVersion
        ? [['Firmware Version', telemetry.firmwareVersion] as InfoRowData]
        : []),
    ]
    : [];

  // LED configuration from Hub's resolved hardware + driver settings
  const { resolvedHardware: hardware, ledConfig } = driver;

  // LED Hardware section - static properties from hardware JSON file
  const ledHardwareRows: InfoRowData[] = hardware
    ? [
      ['Name', hardware.name],
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
    ]
    : [];

  // LED Configuration section - driver-specific settings from drivers.json
  // Calculate actual dimensions accounting for unified multi-panel layout and rotation
  // Rotation codes: a=0°, b=90°, c=180°, d=270° (b and d swap width/height)
  const getRotatedDimensions = (
    panelWidth: number,
    panelHeight: number,
    rotation: string,
  ): { width: number; height: number } => {
    const isRotated90or270 = rotation === 'b' || rotation === 'd';
    return isRotated90or270
      ? { width: panelHeight, height: panelWidth }
      : { width: panelWidth, height: panelHeight };
  };

  // For unified layouts, check first panel's rotation to determine effective dimensions
  const firstPanelRotation = ledConfig?.unified?.[0]?.[0]?.slice(-1) ?? 'a';
  const rotatedDims = getRotatedDimensions(
    hardware?.width ?? 0,
    hardware?.height ?? 0,
    firstPanelRotation,
  );
  const actualWidth = ledConfig?.unified
    ? rotatedDims.width * (ledConfig.unified[0]?.length ?? 1)
    : hardware?.width ?? 0;
  const actualHeight = ledConfig?.unified
    ? rotatedDims.height * ledConfig.unified.length
    : hardware?.height ?? 0;

  const ledConfigRows: InfoRowData[] = ledConfig
    ? [
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
      ['Gamma Correction', `R: ${ledConfig.gamma?.r ?? 2.8}, G: ${ledConfig.gamma?.g ?? 2.8}, B: ${ledConfig.gamma?.b ?? 2.8}`],
      ...(ledConfig.floor.r > 0 || ledConfig.floor.g > 0 || ledConfig.floor.b > 0
        ? [['Floor Cutoff', `R: ${ledConfig.floor.r}, G: ${ledConfig.floor.g}, B: ${ledConfig.floor.b}`] as InfoRowData]
        : []),
      ...(ledConfig.unified
        ? [['Multi-Panel Layout', `${ledConfig.unified.length} ${ledConfig.unified.length === 1 ? 'row' : 'rows'} × ${ledConfig.unified[0]?.length ?? 0} ${(ledConfig.unified[0]?.length ?? 0) === 1 ? 'col' : 'cols'} (${ledConfig.unified.length * (ledConfig.unified[0]?.length ?? 0)} ${ledConfig.unified.length * (ledConfig.unified[0]?.length ?? 0) === 1 ? 'panel' : 'panels'})`] as InfoRowData]
        : []),
    ]
    : [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Header */}
      <Paper
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          p: 2,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
            <IconButton
              onClick={() => {
                void navigate('/drivers');
              }}
              size="small"
              aria-label="Back to Drivers"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ pb: 0 }}>{driver.id}</Typography>
            <DriverState driver={driver} currentFirmwareVersion={currentFirmwareVersion} />
          </Stack>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {driver.ledConfig && <TestLedButton driver={driver} />}
            <DisableDriverButton driver={driver} />
            <SuperButton
              icon={<DescriptionIcon />}
              variant="outlined"
              size="small"
              onClick={() => {
                void window.rgfx.openDriverLog(driver.id);
              }}
            >
              Open driver log
            </SuperButton>
            <SuperButton
              variant="outlined"
              size="small"
              icon={<SettingsIcon />}
              onClick={() => {
                void navigate(`/drivers/${driver.mac}/config`);
              }}
            >
              Configure Driver
            </SuperButton>
            <RestartDriverButton driver={driver} />
            <ResetDriverButton driver={driver} />
            <DeleteDriverButton driver={driver} />
          </Box>
        </Box>
      </Paper>

      {/* Scrollable Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Information Sections */}
        {/* LED Hardware Section - static properties from hardware JSON */}
        <InfoSection
          title="LED Hardware"
          icon={<LightbulbIcon fontSize="small" color="action" />}
          rows={ledHardwareRows}
        >
          {!driver.resolvedHardware && (
            <Alert severity="warning">
              No LED hardware configured for this driver. Use the Configure Driver button to set up
              LED hardware.
            </Alert>
          )}
        </InfoSection>

        {/* LED Configuration Section - driver-specific settings */}
        <InfoSection
          title="LED Configuration"
          icon={<SettingsIcon fontSize="small" color="action" />}
          rows={ledConfigRows}
          showDivider
        >
          {!driver.ledConfig && (
            <Typography variant="body2" color="text.secondary">
              Configuration will be displayed when LED hardware is configured.
            </Typography>
          )}
        </InfoSection>

        <InfoSection
          title="Driver Hardware"
          icon={<SpeedIcon fontSize="small" color="action" />}
          rows={hardwareRows}
          showDivider
        >
          {!telemetry && (
            <Typography variant="body2" color="text.secondary">
              Hardware details will be displayed when the driver connects.
            </Typography>
          )}
        </InfoSection>

        <InfoSection
          title="Driver Telemetry"
          icon={<SensorsIcon fontSize="small" color="action" />}
          rows={telemetry ? telemetryRows : []}
          showDivider
        >
          {!telemetry && (
            <Typography variant="body2" color="text.secondary">
              No telemetry data received in this session.
            </Typography>
          )}
        </InfoSection>

        {driver.state === 'connected' && <TelemetryCharts driverId={driver.id} />}

      </Box>
    </Box>
  );
};

export default DriverCard;
