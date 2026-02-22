import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  Box,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { PresetType, PresetData } from '@/schemas';
import { plasmaPresets, getGradientForPreset } from '@/renderer/data/plasma-presets';
import { gradientPresets } from '@/renderer/data/gradient-presets';

interface PresetSelectorModalProps {
  open: boolean;
  type: PresetType;
  onClose: () => void;
  onSelect: (data: PresetData) => void;
}

function GradientPreview({ gradient }: { gradient: string[] }) {
  const colorStops = gradient.map((color, i) => {
    const position = (i / (gradient.length - 1)) * 100;
    return `${color} ${position}%`;
  });
  const gradientCss = `linear-gradient(to right, ${colorStops.join(', ')})`;

  return (
    <Box
      sx={{
        width: 80,
        height: 24,
        borderRadius: 1,
        background: gradientCss,
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    />
  );
}

export function PresetSelectorModal({
  open,
  type,
  onClose,
  onSelect,
}: PresetSelectorModalProps) {
  const presets = type === 'plasma' ? plasmaPresets : gradientPresets;
  const title = type === 'plasma' ? 'Select Plasma Preset' : 'Select Gradient Preset';

  const handleSelect = (presetName: string) => {
    if (type === 'plasma') {
      const preset = plasmaPresets.find((p) => p.name === presetName);

      if (preset) {
        const gradient = getGradientForPreset(preset);
        onSelect({
          gradient,
          speed: preset.speed,
          scale: preset.scale,
        });
      }
    } else {
      const preset = gradientPresets.find((p) => p.name === presetName);

      if (preset) {
        onSelect({
          gradient: preset.gradient,
        });
      }
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <List sx={{ pt: 0 }}>
          {presets.map((preset) => {
            const gradient = type === 'plasma'
              ? getGradientForPreset(preset as typeof plasmaPresets[0])
              : (preset as typeof gradientPresets[0]).gradient;

            return (
              <ListItemButton
                key={preset.name}
                onClick={() => {
                  handleSelect(preset.name);
                }}
                sx={{ py: 1.5 }}
              >
                <GradientPreview gradient={gradient} />
                <ListItemText
                  primary={preset.name}
                  sx={{ ml: 2 }}
                />
                {type === 'plasma' && (
                  <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    speed: {(preset as typeof plasmaPresets[0]).speed},
                    scale: {(preset as typeof plasmaPresets[0]).scale}
                  </Box>
                )}
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
}
