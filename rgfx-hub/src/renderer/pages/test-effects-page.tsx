import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  Stack,
} from '@mui/material';
import { Science as ScienceIcon } from '@mui/icons-material';
import { useDriverStore } from '../store/driver-store';
import type { EffectPayload } from '~/src/types/mapping-types';

const AVAILABLE_EFFECTS = ['pulse', 'wipe'];

const DEFAULT_PROPS: Record<string, string> = {
  pulse: JSON.stringify({ color: '#FF0000', duration: 1000, fade: true }, null, 2),
  wipe: JSON.stringify({ color: '#00FF00', duration: 500 }, null, 2),
};

export default function TestEffectsPage() {
  const drivers = useDriverStore((state) => state.drivers);
  const connectedDrivers = drivers.filter((d) => d.connected && d.ip);

  const [selectedEffect, setSelectedEffect] = useState<string>('pulse');
  const [propsJson, setPropsJson] = useState<string>(DEFAULT_PROPS.pulse);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState<boolean>(false);

  const handleEffectChange = (effect: string) => {
    setSelectedEffect(effect);
    setPropsJson(DEFAULT_PROPS[effect] ?? '{}');
  };

  const handleDriverToggle = (driverId: string) => {
    const newSelected = new Set(selectedDrivers);
    if (newSelected.has(driverId)) {
      newSelected.delete(driverId);
    } else {
      newSelected.add(driverId);
    }
    setSelectedDrivers(newSelected);
    setSelectAll(newSelected.size === connectedDrivers.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDrivers(new Set());
      setSelectAll(false);
    } else {
      setSelectedDrivers(new Set(connectedDrivers.map((d) => d.id)));
      setSelectAll(true);
    }
  };

  const handleFire = () => {
    void (async () => {
      try {
        const props = JSON.parse(propsJson) as Record<string, unknown>;

        const payload: EffectPayload = {
          effect: selectedEffect,
          props: props,
        };

        if (selectedDrivers.size > 0) {
          payload.drivers = Array.from(selectedDrivers);
        }

        console.log('triggerEffect', payload);

        await window.rgfx.triggerEffect(payload);
      } catch (err) {
        console.error(err);
      }
    })();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScienceIcon />
        Test Effects
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Effect</InputLabel>
            <Select
              value={selectedEffect}
              label="Effect"
              onChange={(e) => {
                handleEffectChange(e.target.value);
              }}
            >
              {AVAILABLE_EFFECTS.map((effect) => (
                <MenuItem key={effect} value={effect}>
                  {effect}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Props (JSON)"
            multiline
            rows={8}
            value={propsJson}
            onChange={(e) => {
              setPropsJson(e.target.value);
            }}
            fullWidth
            placeholder='{"color": "#FF0000", "duration": 1000}'
            helperText="Enter effect-specific properties as JSON"
          />

          <Box>
            <Typography variant="h6" gutterBottom>
              Target Drivers
            </Typography>
            {connectedDrivers.length === 0 ? (
              <Alert severity="warning">No connected drivers available</Alert>
            ) : (
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectAll}
                      onChange={handleSelectAll}
                      indeterminate={
                        selectedDrivers.size > 0 && selectedDrivers.size < connectedDrivers.length
                      }
                    />
                  }
                  label={`All Drivers (${connectedDrivers.length})`}
                />
                {connectedDrivers.map((driver) => (
                  <FormControlLabel
                    key={driver.id}
                    control={
                      <Checkbox
                        checked={selectedDrivers.has(driver.id)}
                        onChange={() => {
                          handleDriverToggle(driver.id);
                        }}
                      />
                    }
                    label={`${driver.id} (${driver.ip ?? 'no IP'})`}
                    sx={{ ml: 3 }}
                  />
                ))}
              </FormGroup>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleFire}
            disabled={connectedDrivers.length === 0}
            startIcon={<ScienceIcon />}
          >
            Fire Effect
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
