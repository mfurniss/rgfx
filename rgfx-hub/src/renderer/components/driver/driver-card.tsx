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
  Info as InfoIcon,
} from '@mui/icons-material';
import type { Driver } from '@/types';
import InfoSection from '../common/info-section';
import TestLedButton from './test-led-button';
import ResetDriverButton from './reset-driver-button';
import RestartDriverButton from './restart-driver-button';
import DisableDriverButton from './disable-driver-button';
import DeleteDriverButton from './delete-driver-button';
import TelemetryCharts from '../charts/telemetry-charts';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '@/config/constants';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import {
  buildTelemetryRows,
  buildHardwareRows,
  buildLedHardwareRows,
  buildLedConfigRows,
  buildDriverStatusRows,
  getRotatedDimensions,
} from './driver-card-rows';

interface DriverCardProps {
  driver: Driver;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { telemetry } = driver;
  const [now, setNow] = useState(Date.now());
  const { firmwareVersions } = useSystemStatusStore((state) => state.systemStatus);

  // Update every second for live timestamps and uptime - only when component is visible
  useEffect(() => {
    const isVisible = location.pathname.startsWith('/drivers/');

    if (isVisible) {
      setNow(Date.now());

      const interval = setInterval(() => {
        setNow(Date.now());
      }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

      return () => {
        clearInterval(interval);
      };
    }
  }, [location.pathname]);

  // Calculate current uptime based on initial uptimeMs from driver
  const driverUptimeAtSnapshot = driver.uptimeMs ?? 0;
  const timeOfSnapshot = driver.lastSeen;
  const timeSinceSnapshot = now - timeOfSnapshot;
  const currentUptime =
    driver.state === 'connected' && telemetry
      ? driverUptimeAtSnapshot + timeSinceSnapshot
      : driverUptimeAtSnapshot;

  // LED configuration from Hub's resolved hardware + driver settings
  const { resolvedHardware: hardware, ledConfig } = driver;

  // Derive hardware filename from hardwareRef
  const hardwareFilename = ledConfig?.hardwareRef
    .replace(/^led-hardware\//, '') ?? 'Unknown';

  // Calculate actual dimensions accounting for unified multi-panel layout and rotation
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

  // Build data rows using extracted utilities
  const telemetryRows = buildTelemetryRows({ driver, telemetry, currentUptime, now });
  const hardwareRows = buildHardwareRows({ driver, telemetry });
  const ledHardwareRows = buildLedHardwareRows({ hardware, hardwareFilename });
  const ledConfigRows = buildLedConfigRows({ ledConfig, hardware, actualWidth, actualHeight });
  const driverStatusRows = buildDriverStatusRows(driver);

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
            <DriverState driver={driver} firmwareVersions={firmwareVersions} />
          </Stack>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {driver.ledConfig && <TestLedButton driver={driver} />}
            <DisableDriverButton driver={driver} />
            <SuperButton
              icon={<DescriptionIcon />}
              variant="outlined"
              onClick={() => {
                void window.rgfx.openDriverLog(driver.id);
              }}
            >
              Open driver log
            </SuperButton>
            <SuperButton
              variant="outlined"
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

        {/* Driver Status Section - metadata and connection health */}
        <InfoSection
          title="Driver Status"
          icon={<InfoIcon fontSize="small" color="action" />}
          rows={driverStatusRows}
          showDivider
        />

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
