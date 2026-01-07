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
import { sendWifiCommandToPort } from '@/renderer/utils/serial-wifi';
import { useUiStore } from '@/renderer/store/ui-store';

interface WifiConfigButtonProps {
  getPort: (() => Promise<SerialPort>) | null;
  disabled?: boolean;
  onLog?: (message: string) => void;
}

const WifiConfigButton: React.FC<WifiConfigButtonProps> = ({
  getPort,
  disabled = false,
  onLog = console.log,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastWifiSsid = useUiStore((state) => state.lastWifiSsid);
  const lastWifiPassword = useUiStore((state) => state.lastWifiPassword);
  const setLastWifiCredentials = useUiStore((state) => state.setLastWifiCredentials);

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
    if (!getPort) {
      setError('No serial port selected');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Get fresh port from selector
      const port = await getPort();

      onLog(`Sending WiFi credentials for SSID: ${ssid}`);
      const result = await sendWifiCommandToPort(port, ssid, password, onLog);

      if (result.success) {
        onLog('WiFi credentials sent successfully');
        setIsOpen(false);
      } else {
        setError(result.error ?? 'Failed to send WiFi credentials');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      onLog(`Error: ${message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <SuperButton
        variant="outlined"
        icon={<ConfigWifiIcon />}
        onClick={handleOpen}
        disabled={!getPort || disabled}
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
        initialSsid={lastWifiSsid}
        initialPassword={lastWifiPassword}
        onCredentialsSave={setLastWifiCredentials}
      />
    </>
  );
};

export default WifiConfigButton;
