import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Alert } from '@mui/material';
import { Driver } from '@/types';

interface OtaDriverSelectorProps {
  drivers: Driver[];
  selectedDriver: string;
  onDriverSelect: (driverId: string) => void;
  disabled: boolean;
}

const OtaDriverSelector: React.FC<OtaDriverSelectorProps> = ({
  drivers,
  selectedDriver,
  onDriverSelect,
  disabled,
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ flex: 1 }}>
          <InputLabel>Select Driver</InputLabel>
          <Select
            value={selectedDriver}
            label="Select Driver"
            onChange={(e) => {
              onDriverSelect(e.target.value);
            }}
            disabled={disabled}
          >
            {drivers.map((driver) => (
              <MenuItem key={driver.id} value={driver.id} disabled={!driver.connected}>
                {driver.id} ({driver.connected ? driver.ip : 'offline'})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {drivers.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No drivers connected. Make sure your drivers are powered on and connected to the network.
        </Alert>
      )}
    </>
  );
};

export default OtaDriverSelector;
