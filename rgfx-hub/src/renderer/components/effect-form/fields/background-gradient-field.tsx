import React from 'react';
import {
  Box,
  IconButton,
  Typography,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import SuperButton from '@/renderer/components/common/super-button';
import { ColorPicker } from './color-picker';

interface GradientValue {
  colors: string[];
  orientation: 'horizontal' | 'vertical';
}

interface BackgroundGradientFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

export function BackgroundGradientField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: BackgroundGradientFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const value = field.value as GradientValue | undefined;
        const colors: string[] = value?.colors ?? [];
        const orientation = value?.orientation ?? 'horizontal';

        const updateValue = (newColors: string[], newOrientation: string) => {
          // Always send object format - empty colors array is valid (turns off background)
          field.onChange({ colors: newColors, orientation: newOrientation });
        };

        const handleColorChange = (index: number, newColor: string) => {
          const newColors = [...colors];
          newColors[index] = newColor;
          updateValue(newColors, orientation);
        };

        const handleAddColor = () => {
          if (colors.length < MAX_GRADIENT_COLORS) {
            const lastColor = colors[colors.length - 1] ?? '#FF0000';
            updateValue([...colors, lastColor], orientation);
          }
        };

        const handleRemoveColor = (index: number) => {
          const newColors = colors.filter((_, i) => i !== index);
          updateValue(newColors, orientation);
        };

        const handleOrientationChange = (newOrientation: string) => {
          updateValue(colors, newOrientation);
        };

        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {label} ({colors.length}/{MAX_GRADIENT_COLORS})
            </Typography>

            {/* Gradient preview bar */}
            {colors.length > 0 && (
              <Box
                sx={{
                  height: 24,
                  borderRadius: 1,
                  mb: 1,
                  background:
                    colors.length >= 2
                      ? `linear-gradient(to ${orientation === 'horizontal' ? 'right' : 'bottom'}, ${colors.join(', ')})`
                      : colors[0],
                }}
              />
            )}

            {/* Color stops */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {colors.map((color, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <ColorPicker
                    value={color}
                    onChange={(newColor) => {
                      handleColorChange(index, newColor);
                    }}
                    fullWidth={false}
                  />
                  <Tooltip title="Remove color">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => {
                          handleRemoveColor(index);
                        }}
                        sx={{ mt: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}

              {/* Add color button */}
              <SuperButton
                variant="outlined"
                onClick={handleAddColor}
                disabled={colors.length >= MAX_GRADIENT_COLORS}
                icon={<AddIcon />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add Color
              </SuperButton>

              {/* Orientation selector - only show when there are colors */}
              {colors.length > 0 && (
                <FormControl size="small" sx={{ mt: 1 }}>
                  <InputLabel>Orientation</InputLabel>
                  <Select
                    value={orientation}
                    label="Orientation"
                    onChange={(e) => {
                      handleOrientationChange(e.target.value);
                    }}
                  >
                    <MenuItem value="horizontal">Horizontal</MenuItem>
                    <MenuItem value="vertical">Vertical</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {error}
              </Typography>
            )}
          </Box>
        );
      }}
    />
  );
}
