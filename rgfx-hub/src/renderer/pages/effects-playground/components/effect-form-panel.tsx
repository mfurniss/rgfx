import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import ResetIcon from '@mui/icons-material/RestartAlt';
import { z } from 'zod';
import { EffectForm } from '@/renderer/components/effect-form';
import { PresetSelectorModal } from '@/renderer/components/effect-form/preset-selector-modal';
import type { PresetData } from '@/schemas';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import type { LayoutConfig, PresetConfig } from '@/schemas/effects';
import { effectDisplayNames, formEffects } from '../effect-helpers';


interface EffectFormPanelProps {
  selectedEffect: string;
  ffmpegAvailable: boolean;
  currentSchema: z.ZodObject | null;
  currentProps: Record<string, unknown>;
  currentFieldTypes?: FieldTypeMap;
  currentLayoutConfig?: LayoutConfig;
  presetConfig: PresetConfig | null;
  onPresetSelect: (data: PresetData) => void;
  onEffectChange: (effect: string) => void;
  onPropsChange: (values: Record<string, unknown>) => void;
  onValidityChange: (isValid: boolean) => void;
  onResetToDefaults: () => void;
}

export const EffectFormPanel = React.memo(
  function EffectFormPanel(props: EffectFormPanelProps) {
    const {
      selectedEffect,
      ffmpegAvailable,
      currentSchema,
      currentProps,
      currentFieldTypes,
      currentLayoutConfig,
      presetConfig,
      onPresetSelect,
      onEffectChange,
      onPropsChange,
      onValidityChange,
      onResetToDefaults,
    } = props;

    const [presetModalOpen, setPresetModalOpen] = useState(false);

    return (
      <Stack spacing={3}>
        {selectedEffect === 'video' && !ffmpegAvailable && (
          <Alert severity="warning">
            ffmpeg is not installed.{' '}
            <Box
              component="a"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                void window.rgfx.openExternal('https://ffmpeg.org/download.html');
              }}
              sx={{ color: 'inherit' }}
            >
              Install it
            </Box>
            {' '}to use the video effect.
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <FormControl fullWidth size="small">
            <InputLabel>Effect</InputLabel>
            <Select
              value={selectedEffect}
              label="Effect"
              onChange={(e) => {
                onEffectChange(e.target.value);
              }}
            >
              {formEffects.map((effect) => (
                <MenuItem key={effect} value={effect}>
                  {effectDisplayNames[effect]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {presetConfig && (
            <Button
              variant="outlined"
              startIcon={<PaletteIcon />}
              onClick={() => {
                setPresetModalOpen(true);
              }}
              sx={{ minWidth: 160, height: 40 }}
            >
              Select Preset
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={onResetToDefaults}
            sx={{ minWidth: 120, height: 40 }}
          >
            Reset
          </Button>
        </Box>

        {presetConfig && (
          <PresetSelectorModal
            open={presetModalOpen}
            type={presetConfig.type}
            onClose={() => {
              setPresetModalOpen(false);
            }}
            onSelect={onPresetSelect}
          />
        )}

        {currentSchema && (
          <EffectForm
            schema={currentSchema}
            defaultValues={currentProps}
            onChange={onPropsChange}
            onValidityChange={onValidityChange}
            fieldTypes={currentFieldTypes}
            layoutConfig={currentLayoutConfig}
          />
        )}
      </Stack>
    );
  },
);
