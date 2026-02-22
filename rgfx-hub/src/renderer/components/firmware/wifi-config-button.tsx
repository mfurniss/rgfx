import React from 'react';
import { SettingsInputAntenna as ConfigWifiIcon } from '@mui/icons-material';
import SuperButton from '../common/super-button';
import WifiConfigDialog from './wifi-config-dialog';
import { sendWifiCommandToPort } from '@/renderer/utils/serial-wifi';
import { useWifiConfigDialog } from '@/renderer/hooks/use-wifi-config-dialog';

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
  const {
    isOpen,
    isSending,
    error,
    lastWifiSsid,
    lastWifiPassword,
    openDialog,
    closeDialog,
    setError,
    setIsSending,
    saveCredentials,
  } = useWifiConfigDialog();

  const handleSubmit = async (ssid: string, password: string) => {
    if (!getPort) {
      setError('No serial port selected');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const port = await getPort();

      onLog(`Sending WiFi credentials for SSID: ${ssid}`);
      const result = await sendWifiCommandToPort(port, ssid, password, onLog);

      if (result.success) {
        onLog('WiFi credentials sent successfully');
        closeDialog();
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
        onClick={openDialog}
        disabled={!getPort || disabled}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Configure WiFi
      </SuperButton>

      <WifiConfigDialog
        open={isOpen}
        onClose={closeDialog}
        onSubmit={handleSubmit}
        isSending={isSending}
        error={error}
        initialSsid={lastWifiSsid}
        initialPassword={lastWifiPassword}
        onCredentialsSave={saveCredentials}
      />
    </>
  );
};

export default WifiConfigButton;
