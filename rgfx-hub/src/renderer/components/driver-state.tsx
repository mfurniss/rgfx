import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, type ChipProps, Tooltip, IconButton } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import type { Driver, DriverState as DriverStateType } from '@/types';

interface DriverStateProps {
  driver: Driver;
  currentFirmwareVersion?: string;
}

const stateConfig: Record<DriverStateType, { label: string; color: ChipProps['color'] }> = {
  connected: { label: 'Connected', color: 'success' },
  disconnected: { label: 'Disconnected', color: 'error' },
  updating: { label: 'Updating', color: 'warning' },
};

/**
 * Displays driver connection state as a chip with optional update warning indicator.
 * - Connected: green chip
 * - Disconnected: red chip
 * - Updating: orange chip
 * - Needs update (when connected): orange warning triangle with tooltip
 */
const DriverState: React.FC<DriverStateProps> = ({ driver, currentFirmwareVersion }) => {
  const navigate = useNavigate();
  const { state, telemetry } = driver;
  const { label, color } = stateConfig[state];

  // Only show update warning when connected and firmware versions differ
  const needsUpdate =
    state === 'connected' &&
    currentFirmwareVersion &&
    telemetry?.firmwareVersion &&
    telemetry.firmwareVersion !== currentFirmwareVersion;

  const chip = <Chip label={label} color={color} size="small" />;

  if (!needsUpdate) {
    return chip;
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {chip}
      <Tooltip
        title={`Update available: Driver v${telemetry.firmwareVersion} → Hub v${currentFirmwareVersion}`}
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
};

export default DriverState;
