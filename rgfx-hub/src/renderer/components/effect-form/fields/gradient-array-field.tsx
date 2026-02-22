import React from 'react';
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import SuperButton from '@/renderer/components/common/super-button';
import { ColorPicker } from './color-picker';

interface GradientArrayFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

export function GradientArrayField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: GradientArrayFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const colors: string[] = Array.isArray(field.value) ? field.value : [];

        const handleColorChange = (index: number, newColor: string) => {
          const newColors = [...colors];
          newColors[index] = newColor;
          field.onChange(newColors);
        };

        const handleAddColor = () => {
          if (colors.length < MAX_GRADIENT_COLORS) {
            const lastColor = colors[colors.length - 1] ?? '#FF0000';
            field.onChange([...colors, lastColor]);
          }
        };

        const handleRemoveColor = (index: number) => {
          if (colors.length <= 1) {
            return; // Enforce minimum 1 color
          }
          const newColors = colors.filter((_, i) => i !== index);
          field.onChange(newColors);
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
                  background: colors.length >= 2
                    ? `linear-gradient(to right, ${colors.join(', ')})`
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
                  <Tooltip title={colors.length <= 1 ? 'At least one color required' : 'Remove color'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => {
                          handleRemoveColor(index);
                        }}
                        disabled={colors.length <= 1}
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
                size="small"
                onClick={handleAddColor}
                disabled={colors.length >= MAX_GRADIENT_COLORS}
                icon={<AddIcon />}
              >
                Add Color
              </SuperButton>
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
