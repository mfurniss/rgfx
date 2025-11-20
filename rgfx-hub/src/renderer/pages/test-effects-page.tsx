import React, { useState, useEffect } from 'react';
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
import { useUiStore } from '../store/ui-store';
import type { EffectPayload } from '~/src/types/mapping-types';

const EFFECTS: Record<string, Record<string, unknown>> = {
  pulse: { color: '#FF0000', duration: 1000, fade: true },
  wipe: { color: '#00FF00', duration: 500 },
  explosion: {
    centerX: 50,
    centerY: 50,
    color: 'random',
    hueSpread: 0,
    particleCount: 100,
    particleSize: 2,
    power: 60,
    powerSpread: 1.6,
    lifespan: 800,
  },
};

export default function TestEffectsPage() {
  // Use a stable selector that only changes when connected driver IDs actually change
  const connectedDriverIds = useDriverStore((state) =>
    state.drivers
      .filter((d) => d.connected && d.ip)
      .map((d) => d.id)
      .sort()
      .join(',')
  );

  const drivers = useDriverStore((state) => state.drivers);
  const connectedDrivers = drivers.filter((d) => d.connected && d.ip);

  // Get state from Zustand store (persisted across navigation)
  const selectedEffect = useUiStore((state) => state.testEffectsSelectedEffect);
  const propsJson = useUiStore((state) => state.testEffectsPropsJson);
  const storedSelectedDrivers = useUiStore((state) => state.testEffectsSelectedDrivers);
  const selectAll = useUiStore((state) => state.testEffectsSelectAll);
  const setTestEffectsState = useUiStore((state) => state.setTestEffectsState);

  // Convert stored array back to Set for component logic
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(
    new Set(storedSelectedDrivers)
  );

  // Initialize with all drivers selected when connected drivers change
  useEffect(() => {
    const driverIds = connectedDriverIds.split(',').filter(Boolean);
    const newSelectedDrivers = new Set(driverIds);
    setSelectedDrivers(newSelectedDrivers);
    setTestEffectsState(selectedEffect, propsJson, newSelectedDrivers, driverIds.length > 0);
  }, [connectedDriverIds, selectedEffect, propsJson, setTestEffectsState]);

  const handleEffectChange = (effect: string) => {
    const newPropsJson = JSON.stringify(EFFECTS[effect] ?? {}, null, 2);
    setTestEffectsState(effect, newPropsJson, selectedDrivers, selectAll);
  };

  const handleDriverToggle = (driverId: string) => {
    const newSelected = new Set(selectedDrivers);
    if (newSelected.has(driverId)) {
      newSelected.delete(driverId);
    } else {
      newSelected.add(driverId);
    }
    setSelectedDrivers(newSelected);
    const newSelectAll = newSelected.size === connectedDrivers.length;
    setTestEffectsState(selectedEffect, propsJson, newSelected, newSelectAll);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      const emptySet = new Set<string>();
      setSelectedDrivers(emptySet);
      setTestEffectsState(selectedEffect, propsJson, emptySet, false);
    } else {
      const allSelected = new Set(connectedDrivers.map((d) => d.id));
      setSelectedDrivers(allSelected);
      setTestEffectsState(selectedEffect, propsJson, allSelected, true);
    }
  };

  const handleTriggerEffect = () => {
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
              {Object.keys(EFFECTS).map((effect) => (
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
              const newPropsJson = e.target.value;
              setTestEffectsState(selectedEffect, newPropsJson, selectedDrivers, selectAll);
            }}
            fullWidth
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
            onClick={handleTriggerEffect}
            disabled={connectedDrivers.length === 0}
            startIcon={<ScienceIcon />}
          >
            Trigger Effect
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
