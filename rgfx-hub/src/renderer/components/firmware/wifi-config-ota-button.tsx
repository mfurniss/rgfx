import React from 'react';
import ConfigWifiIcon from '@mui/icons-material/SettingsInputAntenna';
import SuperButton from '../common/super-button';
import WifiConfigDialog from './wifi-config-dialog';
import { plural } from '@/renderer/utils/formatters';
import { WIFI_UPDATE_DELAY_MS } from '@/config/constants';
import { useWifiConfigDialog } from '@/renderer/hooks/use-wifi-config-dialog';
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

  const connectedSelectedDrivers = drivers.filter(
    (d) => selectedDrivers.has(d.id) && d.state === 'connected',
  );
  const driverCount = connectedSelectedDrivers.length;

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

      await new Promise((resolve) => setTimeout(resolve, WIFI_UPDATE_DELAY_MS));
    }

    if (failCount === 0) {
      onLog(`WiFi update complete: ${successCount} driver(s) updated successfully`);
      closeDialog();
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
        onClick={openDialog}
        disabled={driverCount === 0 || disabled}
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
        description={description}
        submitLabel={driverCount === 1 ? 'Update Driver' : `Update ${driverCount} Drivers`}
        sendingLabel="Updating..."
        initialSsid={lastWifiSsid}
        initialPassword={lastWifiPassword}
        onCredentialsSave={saveCredentials}
      />
    </>
  );
};

export default WifiConfigOtaButton;
