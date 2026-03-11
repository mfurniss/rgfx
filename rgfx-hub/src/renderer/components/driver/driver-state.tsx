import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, type ChipProps, CircularProgress, Tooltip, IconButton } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import type { Driver, DriverState as DriverStateType } from '@/types';
import { getDriverFirmwareUpdateInfo } from '@/renderer/utils/firmware-helpers';

interface DriverStateProps {
  driver: Driver;
  firmwareVersions?: Record<string, string>;
}

const stateConfig: Record<DriverStateType, { label: string; color: ChipProps['color'] }> = {
  connected: { label: 'Connected', color: 'success' },
  disconnected: { label: 'Disconnected', color: 'error' },
  updating: { label: 'Updating', color: 'info' },
};

function ChipWithWarning({
  chip,
  tooltip,
  iconColor,
  onClick,
}: {
  chip: React.ReactElement;
  tooltip: string;
  iconColor: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const icon = <WarningIcon sx={{ color: iconColor, fontSize: 18 }} />;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {chip}
      <Tooltip title={tooltip} arrow>
        {onClick ? (
          <IconButton size="small" onClick={onClick} sx={{ p: 0.25 }}>
            {icon}
          </IconButton>
        ) : (
          <Box component="span" sx={{ display: 'inline-flex' }}>{icon}</Box>
        )}
      </Tooltip>
    </Box>
  );
}

/**
 * Displays driver connection state as a chip with optional warning indicators.
 * - Disabled: grey chip (takes precedence over connection state)
 * - Connected: green chip
 * - Disconnected: red chip
 * - Updating: orange chip
 * - Needs update (when connected): orange warning triangle with tooltip
 * - No LED config (when connected): orange warning triangle with tooltip
 */
const DriverState: React.FC<DriverStateProps> = ({ driver, firmwareVersions }) => {
  const navigate = useNavigate();
  const { state, telemetry, disabled, ledConfig } = driver;

  // Disabled state takes precedence over connection state
  if (disabled) {
    return <Chip label="Disabled" color="default" size="small" />;
  }

  const { label, color } = stateConfig[state];

  // Only show update warning when connected and bundled firmware is newer
  const updateInfo = state === 'connected'
    ? getDriverFirmwareUpdateInfo(driver, firmwareVersions)
    : null;

  // Show LED config warning when connected but no LED hardware configured
  const needsLedConfig = state === 'connected' && !ledConfig;

  // Show LED health warning when connected but RMT output is broken
  const ledUnhealthy = state === 'connected' && telemetry?.ledHealthy === false;

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
  if (updateInfo?.needsUpdate) {
    return (
      <ChipWithWarning
        chip={chip}
        tooltip={`Firmware update: v${updateInfo.driverVersion} → v${updateInfo.targetVersion}`}
        iconColor="warning.main"
        onClick={(e) => {
          e.stopPropagation();
          void navigate('/firmware');
        }}
      />
    );
  }

  if (needsLedConfig) {
    return (
      <ChipWithWarning
        chip={chip}
        tooltip="LED hardware not configured"
        iconColor="warning.main"
        onClick={(e) => {
          e.stopPropagation();
          void navigate(`/drivers/${driver.mac}/config`);
        }}
      />
    );
  }

  if (ledUnhealthy) {
    return (
      <ChipWithWarning
        chip={chip}
        tooltip="LED output not functioning — driver will auto-restart"
        iconColor="error.main"
      />
    );
  }

  return chip;
};

export default DriverState;
