import React, { useState } from 'react';
import {
  Box,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  Popover,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Driver } from '@/types';

interface TargetDriversPickerProps {
  drivers: Driver[];
  selectedDrivers: Set<string>;
  selectAll: boolean;
  onDriverToggle: (driverId: string) => void;
  onSelectAll: () => void;
  disabled?: boolean;
}

export function TargetDriversPicker({
  drivers,
  selectedDrivers,
  selectAll,
  onDriverToggle,
  onSelectAll,
  disabled = false,
}: TargetDriversPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const connectedDrivers = drivers.filter((d) => d.state === 'connected');

  if (drivers.length === 0) {
    return <Alert severity="warning">No drivers available</Alert>;
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={(e) => {
          setAnchorEl(e.currentTarget);
        }}
        endIcon={<ExpandMoreIcon />}
        sx={{ textTransform: 'none' }}
        disabled={disabled}
      >
        Target Drivers: {selectAll && connectedDrivers.length === drivers.length ? 'All' : `${selectedDrivers.size} of ${drivers.length}`}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 320 }}>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAll}
                  onChange={onSelectAll}
                  indeterminate={
                    selectedDrivers.size > 0 && selectedDrivers.size < connectedDrivers.length
                  }
                  disabled={connectedDrivers.length === 0}
                  size="small"
                />
              }
              label={`All Available Drivers (${connectedDrivers.length})`}
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
            />
            {[...drivers].sort((a, b) => a.id.localeCompare(b.id)).map((driver) => (
              <FormControlLabel
                key={driver.id}
                control={
                  <Checkbox
                    checked={selectedDrivers.has(driver.id)}
                    onChange={() => {
                      onDriverToggle(driver.id);
                    }}
                    disabled={driver.state !== 'connected'}
                    size="small"
                  />
                }
                label={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{driver.id}</span>
                    {driver.telemetry?.chipModel && (
                      <Chip
                        label={driver.telemetry.chipModel}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.7rem' }}
                      />
                    )}
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      ({driver.ip ?? 'disconnected'})
                    </Box>
                  </Box>
                }
                sx={{
                  ml: 2,
                  opacity: driver.state === 'connected' ? 1 : 0.4,
                  '& .MuiFormControlLabel-label': { fontSize: '0.9rem' },
                }}
              />
            ))}
          </FormGroup>
        </Box>
      </Popover>
    </>
  );
}
