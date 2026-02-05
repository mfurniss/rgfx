/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { Button } from '@mui/material';
import { LayersClear as LayersClearIcon } from '@mui/icons-material';
import { useDriverStore } from '../../store/driver-store';

export function ClearAllEffectsButton() {
  const drivers = useDriverStore((state) => state.drivers);
  const connectedDrivers = drivers.filter((d) => d.state === 'connected');

  const handleClearEffects = () => {
    void (async () => {
      await window.rgfx.clearTransformerState();

      for (const driver of connectedDrivers) {
        try {
          await window.rgfx.sendDriverCommand(driver.id, 'clear-effects', '');
        } catch (err) {
          console.error('Failed to clear effects on driver:', driver.id, err);
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
      disabled={connectedDrivers.length === 0}
    >
      Clear All Effects
    </Button>
  );
}
