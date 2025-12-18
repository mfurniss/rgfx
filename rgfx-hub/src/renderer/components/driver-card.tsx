import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, Typography, Box, IconButton, Alert, Stack } from '@mui/material';
import SuperButton from './super-button';
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
import InfoSection, { type InfoRowData } from './info-section';
import TestLedButton from './test-led-button';
import ResetDriverButton from './reset-driver-button';
import DisableDriverButton from './disable-driver-button';
import { formatBytes, formatUptime, formatNumber } from '../utils/formatters';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '@/config/constants';
import { useDriverStore } from '../store/driver-store';

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
    // FPS metrics
    ...(telemetry
      ? [{
        label: 'Frame Rate',
        value: `${telemetry.currentFps.toFixed(1)} FPS (min: ${telemetry.minFps.toFixed(1)}, max: ${telemetry.maxFps.toFixed(1)})`,
      }]
      : []),
    // Reset/crash information
    ...(telemetry?.lastResetReason
      ? [{ label: 'Last Reset Reason', value: telemetry.lastResetReason }]
      : []),
    ...(telemetry?.crashCount !== undefined && telemetry.crashCount > 0
      ? [{ label: 'Crash Count', value: formatNumber(telemetry.crashCount) }]
      : []),
    // Driver Uptime from telemetry
    ...(telemetry ? [{ label: 'Driver Uptime', value: formatUptime(Math.max(0, currentUptime)) }] : []),
    // Memory from heartbeat telemetry
    ...(driver.freeHeap !== undefined && driver.minFreeHeap !== undefined
      ? [
        {
          label: 'Memory',
          value: `${formatBytes(driver.freeHeap)} free (min: ${formatBytes(driver.minFreeHeap)})`,
        },
      ]
      : []),
    // Memory details from telemetry
    ...(telemetry
      ? [
        {
          label: 'Free Heap',
          value: `${formatBytes(driver.freeHeap ?? 0)} / ${formatBytes(telemetry.heapSize)}`,
        },
        ...(telemetry.psramSize > 0
          ? [
            {
              label: 'Free PSRAM',
              value: `${formatBytes(telemetry.freePsram)} / ${formatBytes(telemetry.psramSize)}`,
            },
          ]
          : []),
        {
          label: 'Free Sketch Space',
          value: formatBytes(telemetry.freeSketchSpace),
        },
        { label: 'SDK Version', value: telemetry.sdkVersion },
      ]
      : []),
    // WiFi Signal from heartbeat telemetry
    ...(driver.rssi !== undefined
      ? [
        {
          label: 'WiFi Signal',
          value: `${formatNumber(driver.rssi)} dBm (${getSignalQuality(driver.rssi)})`,
        },
      ]
      : []),
    // Uptime from heartbeat telemetry
    ...(driver.uptimeMs !== undefined
      ? [
        {
          label: 'Uptime',
          value: formatUptime(driver.uptimeMs),
        },
      ]
      : []),
    // Message counters
    { label: 'Telemetry Events', value: formatNumber(driver.stats.telemetryEventsReceived) },
    { label: 'MQTT Messages Received', value: formatNumber(driver.stats.mqttMessagesReceived) },
    { label: 'MQTT Errors', value: formatNumber(driver.stats.mqttMessagesFailed) },
    { label: 'UDP Messages Received', value: formatNumber(driver.stats.udpMessagesSent) },
    { label: 'UDP Send Errors', value: formatNumber(driver.stats.udpMessagesFailed) },
    // Last updated timestamp
    ...(driver.lastHeartbeat
      ? [
        {
          label: 'Last Updated',
          value: `${Math.floor(Math.abs(now - driver.lastHeartbeat) / 1000)}s ago`,
        },
      ]
      : []),
  ];

  const hardwareRows: InfoRowData[] = telemetry
    ? [
      // Network info
      { label: 'IP Address', value: driver.ip ?? '' },
      { label: 'MAC Address', value: driver.mac ?? '' },
      { label: 'Hostname', value: driver.hostname ?? '' },
      { label: 'SSID', value: driver.ssid ?? '' },
      // Hardware info
      { label: 'Chip Model', value: telemetry.chipModel },
      { label: 'Chip Revision', value: formatNumber(telemetry.chipRevision) },
      { label: 'CPU Cores', value: formatNumber(telemetry.chipCores) },
      { label: 'CPU Frequency', value: `${formatNumber(telemetry.cpuFreqMHz)} MHz` },
      { label: 'Flash Size', value: formatBytes(telemetry.flashSize) },
      { label: 'Flash Speed', value: `${formatNumber(telemetry.flashSpeed / 1000000)} MHz` },
      {
        label: 'Display Connected',
        value: telemetry.hasDisplay ? 'Yes (OLED)' : 'No',
      },
      ...(telemetry.firmwareVersion
        ? [{ label: 'Firmware Version', value: telemetry.firmwareVersion }]
        : []),
    ]
    : [];

  // LED configuration from Hub's resolved hardware + driver settings
  const { resolvedHardware: hardware, ledConfig } = driver;

  // Always show LED Configuration section (with message if not configured)
  const ledRows: InfoRowData[] = hardware
    ? [
      { label: 'Hardware', value: hardware.name },
      { label: 'Description', value: hardware.description ?? 'Not set' },
      { label: 'SKU', value: hardware.sku ?? 'Not set' },
      ...(hardware.asin ? [{ label: 'ASIN', value: hardware.asin }] : []),
      { label: 'Layout', value: hardware.layout },
      { label: 'LED Count', value: formatNumber(hardware.count) },
      {
        label: 'Matrix Size',
        value:
            hardware.layout !== 'strip'
              ? `${formatNumber(hardware.width ?? 0)} × ${formatNumber(hardware.height ?? 0)}`
              : 'N/A',
      },
      ...(ledConfig ? [{ label: 'Data Pin', value: formatNumber(ledConfig.pin) }] : []),
      { label: 'Chipset', value: hardware.chipset ?? 'Unknown' },
      { label: 'Color Order', value: hardware.colorOrder ?? 'Unknown' },
      ...(ledConfig
        ? [
          {
            label: 'Max Brightness',
            value:
                  ledConfig.maxBrightness != null
                    ? formatNumber(ledConfig.maxBrightness)
                    : 'Not set',
          },
          {
            label: 'Brightness Limit',
            value:
                  ledConfig.globalBrightnessLimit != null
                    ? formatNumber(ledConfig.globalBrightnessLimit)
                    : 'Not set',
          },
          { label: 'Dithering', value: ledConfig.dithering ? 'Yes' : 'No' },
        ]
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
                void navigate('/');
              }}
              size="small"
              aria-label="Back to System Status"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ pb: 0 }}>{driver.id}</Typography>
            <DriverState driver={driver} currentFirmwareVersion={currentFirmwareVersion} />
          </Stack>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <DisableDriverButton driver={driver} />
            <ResetDriverButton driver={driver} />
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
                void navigate(`/driver/${driver.mac}/config`);
              }}
            >
              Configure Driver
            </SuperButton>
          </Box>
        </Box>
      </Paper>

      {/* Scrollable Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Information Sections */}
        {/* LED Configuration Section - Always shown at top */}
        <InfoSection
          title="LED Configuration"
          icon={<LightbulbIcon fontSize="small" color="action" />}
          rows={ledRows}
          titleAction={driver.ledConfig ? <TestLedButton driver={driver} /> : undefined}
        >
          {!driver.ledConfig && (
            <Alert severity="warning">
              This driver needs LED configuration.
              <br />
              Edit&nbsp;
              <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                ~/.rgfx/drivers.json
              </Typography>
              &nbsp; to configure LED hardware.
            </Alert>
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

      </Box>
    </Box>
  );
};

export default DriverCard;
