import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Chip, Tooltip } from '@mui/material';
import {
  Memory as MemoryIcon,
  Router as RouterIcon,
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  QueryStats as QueryStatsIcon,
} from '@mui/icons-material';
import type { Driver } from '~/src/types';
import InfoSection, { type InfoRowData } from './info-section';
import TestLedButton from './test-led-button';
import { formatBytes, formatUptime, formatTimestamp, formatNumber } from '../utils/formatters';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '~/src/config/constants';

interface DriverCardProps {
  driver: Driver;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver }) => {
  const { sysInfo } = driver;
  const [now, setNow] = useState(Date.now());

  // Update every second for live timestamps and uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Calculate current uptime based on initial uptimeMs from driver
  // Only available when sysInfo is present
  const driverUptimeAtSnapshot = sysInfo?.uptimeMs ?? 0;
  const timeOfSnapshot = driver.lastSeen;
  const timeSinceSnapshot = now - timeOfSnapshot;
  const currentUptime =
    driver.connected && sysInfo
      ? driverUptimeAtSnapshot + timeSinceSnapshot
      : driverUptimeAtSnapshot;

  // Prepare data arrays for InfoSection components
  // Network info - only shown when sysInfo is available
  const networkRows: InfoRowData[] = sysInfo
    ? [
        { label: 'IP Address', value: sysInfo.ip },
        { label: 'MAC Address', value: sysInfo.mac },
        { label: 'Hostname', value: sysInfo.hostname },
        { label: 'SSID', value: sysInfo.ssid },
        { label: 'Signal (RSSI)', value: `${formatNumber(sysInfo.rssi)} dBm` },
      ]
    : [];

  const hardwareRows: InfoRowData[] = sysInfo
    ? [
        { label: 'Chip Model', value: sysInfo.chipModel },
        { label: 'Chip Revision', value: formatNumber(sysInfo.chipRevision) },
        { label: 'CPU Cores', value: formatNumber(sysInfo.chipCores) },
        { label: 'CPU Frequency', value: `${formatNumber(sysInfo.cpuFreqMHz)} MHz` },
        { label: 'Flash Size', value: formatBytes(sysInfo.flashSize) },
        { label: 'Flash Speed', value: `${formatNumber(sysInfo.flashSpeed / 1000000)} MHz` },
        {
          label: 'Display Connected',
          value: sysInfo.hasDisplay ? 'Yes (OLED)' : 'No',
        },
        ...(sysInfo.firmwareVersion
          ? [{ label: 'Firmware Version', value: sysInfo.firmwareVersion }]
          : []),
      ]
    : [];

  const memoryRows: InfoRowData[] = sysInfo
    ? [
        {
          label: 'Free Heap',
          value: `${formatBytes(sysInfo.freeHeap)} / ${formatBytes(sysInfo.heapSize)}`,
        },
        ...(sysInfo.psramSize > 0
          ? [
              {
                label: 'Free PSRAM',
                value: `${formatBytes(sysInfo.freePsram)} / ${formatBytes(sysInfo.psramSize)}`,
              },
            ]
          : []),
        {
          label: 'Free Sketch Space',
          value: formatBytes(sysInfo.freeSketchSpace),
        },
        { label: 'SDK Version', value: sysInfo.sdkVersion },
      ]
    : [];

  // LED configuration from Hub's resolved hardware + driver settings
  const hardware = driver.resolvedHardware;
  const ledConfig = driver.ledConfig;

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
                  ledConfig.maxBrightness !== undefined
                    ? formatNumber(ledConfig.maxBrightness)
                    : 'Not set',
              },
              {
                label: 'Brightness Limit',
                value:
                  ledConfig.globalBrightnessLimit !== undefined
                    ? formatNumber(ledConfig.globalBrightnessLimit)
                    : 'Not set',
              },
              { label: 'Dithering', value: ledConfig.dithering ? 'Yes' : 'No' },
            ]
          : []),
      ]
    : [];

  const statsRows: InfoRowData[] = [
    ...(sysInfo ? [{ label: 'Driver Uptime', value: formatUptime(currentUptime) }] : []),
    { label: 'Hub First Seen', value: formatTimestamp(driver.firstSeen) },
    { label: 'Hub Last Seen', value: formatTimestamp(driver.lastSeen) },
    { label: 'MQTT Messages', value: formatNumber(driver.stats.mqttMessagesReceived) },
    { label: 'MQTT Errors', value: formatNumber(driver.stats.mqttMessagesFailed) },
    { label: 'UDP Packets Sent', value: formatNumber(driver.stats.udpMessagesSent) },
    { label: 'UDP Send Errors', value: formatNumber(driver.stats.udpMessagesFailed) },
  ];


  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6">{driver.id}</Typography>
        {driver.connected && !driver.ledConfig ? (
          <Tooltip title="Connected but needs LED configuration" arrow>
            <Chip label="Connected" color="warning" size="small" />
          </Tooltip>
        ) : (
          <Chip
            label={driver.connected ? 'Connected' : 'Disconnected'}
            color={driver.connected ? 'success' : 'error'}
            size="small"
          />
        )}
      </Box>

      {/* Information Sections */}
      {/* LED Configuration Section - Always shown at top */}
      <InfoSection
        title="LED Configuration"
        icon={<LightbulbIcon fontSize="small" color="action" />}
        rows={ledRows}
        titleAction={driver.ledConfig ? <TestLedButton driver={driver} /> : undefined}
      >
        {!driver.ledConfig && (
          <Box sx={{ mt: 1, p: 1.5, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.dark">
              This driver needs LED configuration. Edit{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                ~/.rgfx/drivers.json
              </Typography>{' '}
              to configure LED hardware.
            </Typography>
          </Box>
        )}
      </InfoSection>

      {networkRows.length > 0 && (
        <InfoSection
          title="Network"
          icon={<RouterIcon fontSize="small" color="action" />}
          rows={networkRows}
          showDivider
        />
      )}

      {hardwareRows.length > 0 && (
        <InfoSection
          title="Hardware"
          icon={<SpeedIcon fontSize="small" color="action" />}
          rows={hardwareRows}
          showDivider
        />
      )}

      {memoryRows.length > 0 && (
        <InfoSection
          title="Memory"
          icon={<MemoryIcon fontSize="small" color="action" />}
          rows={memoryRows}
          showDivider
        />
      )}

      <InfoSection
        title="Statistics"
        icon={<QueryStatsIcon fontSize="small" color="action" />}
        rows={statsRows}
        showDivider
      />
    </Paper>
  );
};

export default DriverCard;
