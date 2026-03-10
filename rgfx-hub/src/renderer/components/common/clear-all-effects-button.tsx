import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@mui/material';
import LayersClearIcon from '@mui/icons-material/LayersClear';
import { useDriverStore } from '../../store/driver-store';
import { useUiStore } from '../../store/ui-store';

export function ClearAllEffectsButton() {
  const connectedDriverIds = useDriverStore(
    useShallow((state) =>
      state.drivers
        .filter((d) => d.state === 'connected')
        .map((d) => d.id),
    ),
  );

  const handleClearEffects = () => {
    useUiStore.getState().resetAllAutoIntervals();

    void (async () => {
      await window.rgfx.clearTransformerState();

      for (const driverId of connectedDriverIds) {
        try {
          await window.rgfx.sendDriverCommand(driverId, 'clear-effects', '');
        } catch (err) {
          console.error('Failed to clear effects on driver:', driverId, err);
        }
      }
    })();
  };

  return (
    <Button
      variant="outlined"
      color="warning"
      startIcon={<LayersClearIcon />}
      onClick={handleClearEffects}
      disabled={connectedDriverIds.length === 0}
    >
      Clear All Effects
    </Button>
  );
}
