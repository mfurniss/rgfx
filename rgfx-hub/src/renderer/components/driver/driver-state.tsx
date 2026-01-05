import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, type ChipProps, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import type { Driver, DriverState as DriverStateType } from '@/types';

interface DriverStateProps {
  driver: Driver;
  currentFirmwareVersion?: string;
}

const stateConfig: Record<DriverStateType, { label: string; color: ChipProps['color'] }> = {
  connected: { label: 'Connected', color: 'success' },
  disconnected: { label: 'Disconnected', color: 'error' },
  updating: { label: 'Updating', color: 'info' },
};

/**
 * Displays driver connection state as a chip with optional warning indicators.
 * - Disabled: grey chip (takes precedence over connection state)
 * - Connected: green chip
 * - Disconnected: red chip
 * - Updating: orange chip
 * - Needs update (when connected): orange warning triangle with tooltip
 * - No LED config (when connected): orange warning triangle with tooltip
 */
const DriverState: React.FC<DriverStateProps> = ({ driver, currentFirmwareVersion }) => {
  const navigate = useNavigate();
  const { state, telemetry, disabled, ledConfig } = driver;

  // Disabled state takes precedence over connection state
  if (disabled) {
    return <Chip label="Disabled" color="default" size="small" />;
  }

  const { label, color } = stateConfig[state];

  // Only show update warning when connected and firmware versions differ
  const needsFirmwareUpdate =
    state === 'connected' &&
    currentFirmwareVersion &&
    telemetry?.firmwareVersion &&
    telemetry.firmwareVersion !== currentFirmwareVersion;

  // Show LED config warning when connected but no LED hardware configured
  const needsLedConfig = state === 'connected' && !ledConfig;

  const chip = <Chip label={label} color={color} size="small" />;

  if (state === 'updating') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        {chip}
        <CircularProgress size={16} />
      </Box>
    );
  }

  // Firmware update takes priority over LED config warning
  if (needsFirmwareUpdate) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        {chip}
        <Tooltip
          title={`Firmware update: v${telemetry.firmwareVersion} → v${currentFirmwareVersion}`}
          arrow
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              void navigate('/firmware');
            }}
            sx={{ p: 0.25 }}
          >
            <WarningIcon sx={{ color: 'warning.main', fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  if (needsLedConfig) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        {chip}
        <Tooltip title="LED hardware not configured" arrow>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              void navigate(`/drivers/${driver.mac}/config`);
            }}
            sx={{ p: 0.25 }}
          >
            <WarningIcon sx={{ color: 'warning.main', fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return chip;
};

export default DriverState;
