/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState } from 'react';
import { SettingsInputAntenna as ConfigWifiIcon } from '@mui/icons-material';
import SuperButton from '../common/super-button';
import WifiConfigDialog from './wifi-config-dialog';
import { plural } from '../../utils/formatters';
import { WIFI_UPDATE_DELAY_MS } from '@/config/constants';
import type { Driver } from '@/types';

interface WifiConfigOtaButtonProps {
  drivers: Driver[];
  selectedDrivers: Set<string>;
  disabled?: boolean;
  onLog?: (message: string) => void;
}

const WifiConfigOtaButton: React.FC<WifiConfigOtaButtonProps> = ({
  drivers,
  selectedDrivers,
  disabled = false,
  onLog = console.log,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectedSelectedDrivers = drivers.filter(
    (d) => selectedDrivers.has(d.id) && d.state === 'connected',
  );
  const driverCount = connectedSelectedDrivers.length;

  const handleOpen = () => {
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isSending) {
      setIsOpen(false);
      setError(null);
    }
  };

  const handleSubmit = async (ssid: string, password: string) => {
    if (driverCount === 0) {
      setError('No connected drivers selected');
      return;
    }

    setIsSending(true);
    setError(null);

    const payload = JSON.stringify({ ssid, password });
    let successCount = 0;
    let failCount = 0;

    onLog(`Updating WiFi credentials on ${driverCount} driver(s)...`);

    for (const driver of connectedSelectedDrivers) {
      onLog(`[${driver.id}] Sending WiFi credentials...`);

      try {
        await window.rgfx.sendDriverCommand(driver.id, 'wifi', payload);
        onLog(`[${driver.id}] WiFi credentials sent successfully`);
        successCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        onLog(`[${driver.id}] Failed: ${message}`);
        failCount++;
      }

      // Delay after each update to allow driver to process and reboot
      await new Promise((resolve) => setTimeout(resolve, WIFI_UPDATE_DELAY_MS));
    }

    if (failCount === 0) {
      onLog(`WiFi update complete: ${successCount} driver(s) updated successfully`);
      setIsOpen(false);
    } else if (successCount > 0) {
      setError(`Partial success: ${successCount} succeeded, ${failCount} failed`);
      onLog(`WiFi update complete: ${successCount} succeeded, ${failCount} failed`);
    } else {
      setError(`Failed to update all ${failCount} driver(s)`);
      onLog(`WiFi update failed for all ${failCount} driver(s)`);
    }

    setIsSending(false);
  };

  const description = `This will update WiFi configuration on ${driverCount} ${plural(driverCount, 'driver')}. ${plural(driverCount, 'Driver')} will restart after receiving new credentials.`;

  return (
    <>
      <SuperButton
        variant="outlined"
        icon={<ConfigWifiIcon />}
        onClick={handleOpen}
        disabled={driverCount === 0 || disabled}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Configure WiFi
      </SuperButton>

      <WifiConfigDialog
        open={isOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        isSending={isSending}
        error={error}
        description={description}
        submitLabel={driverCount === 1 ? 'Update Driver' : `Update ${driverCount} Drivers`}
        sendingLabel="Updating..."
      />
    </>
  );
};

export default WifiConfigOtaButton;
