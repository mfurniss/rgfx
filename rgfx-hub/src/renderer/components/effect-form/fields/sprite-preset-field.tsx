/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState, useCallback } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Button,
  Typography,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import {
  Controller,
  useFormContext,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { spritePresets, findPresetByImage } from '@/renderer/data/sprite-presets';

interface SpritePresetFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

// Special value to indicate a loaded GIF (not a preset)
const LOADED_GIF_VALUE = '__loaded_gif__';

export function SpritePresetField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: SpritePresetFieldProps<T>) {
  const { setValue } = useFormContext();
  const [loadedGifInfo, setLoadedGifInfo] = useState<{
    frameCount: number;
    width: number;
    height: number;
  } | null>(null);

  const handleLoadGif = useCallback(async () => {
    try {
      const result = await window.rgfx.loadGif();

      if (!result) {
        return; // User cancelled
      }

      // Set images field (the field this component controls)
      setValue(name, result.images as never, { shouldValidate: true });

      // Set palette field
      setValue('palette' as Path<T>, result.palette as never, { shouldValidate: true });

      // Set frameRate if available (animated GIF)
      if (result.frameRate !== undefined) {
        setValue('frameRate' as Path<T>, result.frameRate as never, { shouldValidate: true });
      }

      // Store GIF path for transformer code generation (will be stripped before sending to driver)
      if (result.filePath) {
        setValue('__gifPath' as Path<T>, result.filePath as never);
      }

      // Store info about loaded GIF for display
      setLoadedGifInfo({
        frameCount: result.frameCount,
        width: result.width,
        height: result.height,
      });
    } catch (err) {
      console.error('Failed to load GIF:', err);
    }
  }, [name, setValue]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const currentImages = field.value as string[][] | undefined;
        // Presets are single-frame, so compare against first frame only
        const firstFrame = currentImages?.[0];
        const currentPreset = firstFrame ? findPresetByImage(firstFrame) : undefined;
        // If GIF was loaded, show special value; otherwise show preset name
        const selectedValue = loadedGifInfo
          ? LOADED_GIF_VALUE
          : (currentPreset?.name ?? '');

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl fullWidth error={!!error} size="small">
                <InputLabel>{label}</InputLabel>
                <Select
                  value={selectedValue}
                  label={label}
                  onChange={(e) => {
                    if (e.target.value === LOADED_GIF_VALUE) {
                      return; // Don't allow re-selecting the GIF option
                    }

                    const preset = spritePresets.find((p) => p.name === e.target.value);

                    if (preset) {
                      // Wrap single-frame preset in array to match string[][] format
                      field.onChange([preset.image]);
                      setLoadedGifInfo(null); // Clear GIF info when selecting preset
                      // Clear the GIF path marker
                      setValue('__gifPath' as Path<T>, undefined as never);
                    }
                  }}
                >
                  {loadedGifInfo && (
                    <MenuItem value={LOADED_GIF_VALUE}>
                      Loaded GIF ({loadedGifInfo.frameCount} frames,
                      {' '}{loadedGifInfo.width}x{loadedGifInfo.height})
                    </MenuItem>
                  )}
                  {spritePresets.map((preset) => (
                    <MenuItem key={preset.name} value={preset.name}>
                      {preset.name}
                    </MenuItem>
                  ))}
                </Select>
                {error && <FormHelperText>{error}</FormHelperText>}
              </FormControl>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImageIcon />}
                onClick={() => {
                  void handleLoadGif();
                }}
                sx={{ minWidth: 120, whiteSpace: 'nowrap' }}
              >
                Load GIF
              </Button>
            </Box>
            {loadedGifInfo && (
              <Typography variant="caption" color="text.secondary">
                Loaded: {loadedGifInfo.frameCount} frame{loadedGifInfo.frameCount !== 1 ? 's' : ''}, {loadedGifInfo.width}×{loadedGifInfo.height}px
              </Typography>
            )}
          </Box>
        );
      }}
    />
  );
}
