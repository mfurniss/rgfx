/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@mui/material';
import { LayersClear as LayersClearIcon } from '@mui/icons-material';
import { useDriverStore } from '../../store/driver-store';

export function ClearAllEffectsButton() {
  const connectedDriverIds = useDriverStore(
    useShallow((state) =>
      state.drivers
        .filter((d) => d.state === 'connected')
        .map((d) => d.id),
    ),
  );

  const handleClearEffects = () => {
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
