import React from 'react';
import { Box, Paper, Typography, Slider } from '@mui/material';
import { useUiStore } from '../../store/ui-store';

export function EffectModifiersSection() {
  const stripLifespanScale = useUiStore((state) => state.stripLifespanScale);
  const setStripLifespanScale = useUiStore((state) => state.setStripLifespanScale);

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Effect Modifiers
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Adjust effect duration scaling for LED strips
      </Typography>
      <Box sx={{ px: 1 }}>
        <Typography variant="body2" gutterBottom>
          Strip Lifespan Scale: {stripLifespanScale.toFixed(2)}
        </Typography>
        <Slider
          value={stripLifespanScale}
          onChange={(_e, value) => {
            if (typeof value === 'number') {
              setStripLifespanScale(value);
            }
          }}
          min={0.1}
          max={1.0}
          step={0.05}
          marks={[
            { value: 0.1, label: '0.1' },
            { value: 0.6, label: '0.6' },
            { value: 1.0, label: '1.0' },
          ]}
          valueLabelDisplay="auto"
          aria-label="Strip lifespan scale"
        />
        <Typography variant="caption" color="text.secondary">
          Scales effect duration on LED strips. Lower values = shorter effects. Matrices use full
          duration.
        </Typography>
      </Box>
    </Paper>
  );
}
