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
import { effectSchemas, safeValidateEffectProps, isEffectName } from '../../schemas';

/**
 * Validate props JSON against the effect schema
 * Returns null if valid, or an error message string if invalid
 */
function validateProps(effect: string, json: string): string | null {
  // First check if it's valid JSON
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return 'Invalid JSON syntax';
  }

  // Then validate against the effect schema
  if (!isEffectName(effect)) {
    return `Unknown effect: ${effect}`;
  }

  const result = safeValidateEffectProps(effect, parsed);

  if (!result.success) {
    // Format Zod errors nicely
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    });
    return issues.join('; ');
  }

  return null;
}

export default function TestEffectsPage() {
  // Use a stable selector that only changes when connected driver IDs actually change
  const connectedDriverIds = useDriverStore((state) =>
    state.drivers
      .filter((d) => d.connected)
      .map((d) => d.id)
      .sort()
      .join(',')
  );

  const drivers = useDriverStore((state) => state.drivers);
  const connectedDrivers = drivers.filter((d) => d.connected);

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
    // Only reset props if switching to a different effect
    if (effect !== selectedEffect && isEffectName(effect)) {
      const defaults = effectSchemas[effect].parse({});
      const newPropsJson = JSON.stringify(defaults, null, 2);
      setTestEffectsState(effect, newPropsJson, selectedDrivers, selectAll);
    }
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
        {(() => {
          const validationError = validateProps(selectedEffect, propsJson);
          const isValid = validationError === null;
          return (
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
                  {Object.keys(effectSchemas).map((effect) => (
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
                error={!isValid}
                helperText={validationError}
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
              />

              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleTriggerEffect}
                disabled={connectedDrivers.length === 0 || !isValid}
                startIcon={<ScienceIcon />}
              >
                Trigger Effect
              </Button>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Target Drivers
                </Typography>
                {drivers.length === 0 ? (
                  <Alert severity="warning">No drivers available</Alert>
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
                          disabled={connectedDrivers.length === 0}
                          sx={{ py: 0.5 }}
                        />
                      }
                      label={`All Drivers (${connectedDrivers.length})`}
                      sx={{
                        my: 0,
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.95rem',
                        },
                      }}
                    />
                    {drivers.map((driver) => {
                      return (
                        <FormControlLabel
                          key={driver.id}
                          control={
                            <Checkbox
                              checked={selectedDrivers.has(driver.id)}
                              onChange={() => {
                                handleDriverToggle(driver.id);
                              }}
                              disabled={!driver.connected}
                              sx={{ py: 0.5 }}
                            />
                          }
                          label={`${driver.id} (${driver.ip ?? 'disconnected'})`}
                          sx={{
                            ml: 3,
                            my: 0,
                            opacity: driver.connected ? 1 : 0.4,
                            color: driver.connected ? 'text.primary' : 'text.disabled',
                            '& .MuiFormControlLabel-label': {
                              fontSize: '0.95rem',
                            },
                          }}
                        />
                      );
                    })}
                  </FormGroup>
                )}
              </Box>
            </Stack>
          );
        })()}
      </Paper>
    </Box>
  );
}
