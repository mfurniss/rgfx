/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import {
  Controller,
  type Control,
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import { NumberField } from '@/renderer/components/common/number-field';
import { GpioPinSelect } from '@/renderer/components/common/gpio-pin-select';
import { UnifiedPanelEditor } from '@/renderer/components/editors/unified-panel-editor';
import type { ConfiguredDriverInput } from '@/schemas';
import type { LEDHardware } from '@/types';
import { getHardwareDisplayName, isRGBWHardware } from '../utils/led-config-helpers';

interface LedConfigSectionProps {
  control: Control<ConfiguredDriverInput>;
  watch: UseFormWatch<ConfiguredDriverInput>;
  setValue: UseFormSetValue<ConfiguredDriverInput>;
  ledHardwareOptions: string[];
  selectedHardware: LEDHardware | null;
  loadingHardware: boolean;
  isStrip: boolean;
  chipModel?: string;
}

export const LedConfigSection: React.FC<LedConfigSectionProps> = ({
  control,
  watch,
  setValue,
  ledHardwareOptions,
  selectedHardware,
  loadingHardware,
  isStrip,
  chipModel,
}) => {
  const ledConfig = watch('ledConfig');

  const handleHardwareChange = (value: string) => {
    if (value === '') {
      setValue('ledConfig', null, { shouldDirty: true, shouldValidate: true });
    } else {
      // Apply defaults only when first configuring (no existing config)
      const isNewConfig = !ledConfig;
      setValue(
        'ledConfig',
        {
          hardwareRef: value,
          pin: ledConfig?.pin ?? 16,
          offset: ledConfig?.offset,
          globalBrightnessLimit: isNewConfig ? 128 : ledConfig.globalBrightnessLimit,
          dithering: ledConfig?.dithering ?? true,
          powerSupplyVolts: ledConfig?.powerSupplyVolts,
          maxPowerMilliamps: isNewConfig ? 500 : ledConfig.maxPowerMilliamps,
          unified: ledConfig?.unified,
          rotation: ledConfig?.rotation,
          reverse: ledConfig?.reverse,
          gamma: ledConfig?.gamma ?? { r: 2.8, g: 2.8, b: 2.8 },
          floor: ledConfig?.floor ?? { r: 0, g: 0, b: 0 },
          rgbwMode: ledConfig?.rgbwMode,
        },
        { shouldDirty: true, shouldValidate: true },
      );
    }
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>
        LED Configuration
      </Typography>

      {loadingHardware ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography>Loading hardware options...</Typography>
        </Box>
      ) : ledHardwareOptions.length === 0 ? (
        <Alert severity="warning">
          No LED hardware definitions found. Add hardware files to ~/.rgfx/led-hardware/
        </Alert>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>LED Hardware</InputLabel>
              <Select
                SelectDisplayProps={
                  { 'data-testid': 'led-hardware-select' } as React.HTMLAttributes<HTMLDivElement>
                }
                value={ledConfig?.hardwareRef ?? ''}
                label="LED Hardware"
                onChange={(e) => {
                  handleHardwareChange(e.target.value);
                }}
              >
                <MenuItem value="">None</MenuItem>
                {ledHardwareOptions.map((hw) => (
                  <MenuItem key={hw} value={hw}>
                    {getHardwareDisplayName(hw)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {ledConfig?.hardwareRef && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <GpioPinSelect
                  name="ledConfig.pin"
                  control={control}
                  chipModel={chipModel}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <NumberField
                  name="ledConfig.offset"
                  control={control}
                  label="LED Offset"
                  helperText="Starting LED index offset (optional)"
                  min={0}
                />
              </Grid>
              {/* Strip-specific: Reverse direction toggle */}
              {isStrip && (
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Controller
                    name="ledConfig.reverse"
                    control={control}
                    render={({ field }) => (
                      <Tooltip
                        title="Reverse the LED direction so index 0 maps to the last physical LED"
                        placement="right"
                      >
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value ?? false} />}
                          label="Reverse Direction"
                        />
                      </Tooltip>
                    )}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, md: 6 }}>
                <NumberField
                  name="ledConfig.globalBrightnessLimit"
                  control={control}
                  label="Maximum Brightness"
                  helperText="Maximum brightness (0-255, optional)"
                  min={0}
                  max={255}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <NumberField
                  name="ledConfig.powerSupplyVolts"
                  control={control}
                  label="Power Supply Voltage"
                  helperText="Power supply voltage (1-24V, optional)"
                  min={1}
                  max={24}
                  allowFloat
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <NumberField
                  name="ledConfig.maxPowerMilliamps"
                  control={control}
                  label="Max Power (mA)"
                  helperText="Maximum power draw in milliamps (1-10000, optional)"
                  min={1}
                  max={10000}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="ledConfig.dithering"
                  control={control}
                  render={({ field }) => (
                    <Tooltip
                      title="Smooths color transitions at low brightness by rapidly alternating between nearby color values"
                      placement="right"
                    >
                      <FormControlLabel
                        control={<Checkbox {...field} checked={field.value ?? false} />}
                        label="Enable Temporal Dithering"
                      />
                    </Tooltip>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                  Gamma Correction (1.0 = linear, 2.8 = typical for WS2812B)
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <NumberField
                  name="ledConfig.gamma.r"
                  control={control}
                  label="Gamma Red"
                  helperText="Red channel gamma (1.0-5.0)"
                  min={1.0}
                  max={5.0}
                  allowFloat
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <NumberField
                  name="ledConfig.gamma.g"
                  control={control}
                  label="Gamma Green"
                  helperText="Green channel gamma (1.0-5.0)"
                  min={1.0}
                  max={5.0}
                  allowFloat
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <NumberField
                  name="ledConfig.gamma.b"
                  control={control}
                  label="Gamma Blue"
                  helperText="Blue channel gamma (1.0-5.0)"
                  min={1.0}
                  max={5.0}
                  allowFloat
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                  Floor Cutoff (0-255, values at or below floor become 0)
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <NumberField
                  name="ledConfig.floor.r"
                  control={control}
                  label="Floor Red"
                  helperText="Red channel floor cutoff (0-255)"
                  min={0}
                  max={255}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <NumberField
                  name="ledConfig.floor.g"
                  control={control}
                  label="Floor Green"
                  helperText="Green channel floor cutoff (0-255)"
                  min={0}
                  max={255}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <NumberField
                  name="ledConfig.floor.b"
                  control={control}
                  label="Floor Blue"
                  helperText="Blue channel floor cutoff (0-255)"
                  min={0}
                  max={255}
                />
              </Grid>
              {/* RGBW-specific: Color mode selection */}
              {isRGBWHardware(selectedHardware) && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="ledConfig.rgbwMode"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>RGBW Mode</InputLabel>
                        <Select {...field} value={field.value ?? 'exact'} label="RGBW Mode">
                          <MenuItem value="exact">Exact Colors</MenuItem>
                          <MenuItem value="max_brightness">Max Brightness</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}
              {/* Matrix-specific: Single-panel rotation (only when not using multi-panel) */}
              {!isStrip && !ledConfig.unified && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="ledConfig.rotation"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Panel Rotation</InputLabel>
                        <Select
                          {...field}
                          value={field.value ?? '0'}
                          label="Panel Rotation"
                        >
                          <MenuItem value="0">0° (No rotation)</MenuItem>
                          <MenuItem value="90">90° Clockwise</MenuItem>
                          <MenuItem value="180">180° (Upside down)</MenuItem>
                          <MenuItem value="270">270° Clockwise</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}
              {/* Matrix-specific: Unified panel layout editor */}
              {!isStrip && (
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="ledConfig.unified"
                    control={control}
                    render={({ field }) => (
                      <UnifiedPanelEditor value={field.value} onChange={field.onChange} />
                    )}
                  />
                </Grid>
              )}
            </>
          )}
        </Grid>
      )}
    </>
  );
};
