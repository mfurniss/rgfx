import { useState, useCallback } from 'react';
import { useUiStore } from '../store/ui-store';

interface UseWifiConfigDialogReturn {
  isOpen: boolean;
  isSending: boolean;
  error: string | null;
  lastWifiSsid: string;
  lastWifiPassword: string;
  openDialog: () => void;
  closeDialog: () => void;
  setError: (error: string | null) => void;
  setIsSending: (sending: boolean) => void;
  saveCredentials: (ssid: string, password: string) => void;
}

/**
 * Hook to manage WiFi config dialog state and stored credentials.
 * Consolidates the common state management pattern used by both
 * WifiConfigButton and WifiConfigOtaButton.
 */
export function useWifiConfigDialog(): UseWifiConfigDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastWifiSsid = useUiStore((state) => state.lastWifiSsid);
  const lastWifiPassword = useUiStore((state) => state.lastWifiPassword);
  const setLastWifiCredentials = useUiStore((state) => state.setLastWifiCredentials);

  const openDialog = useCallback(() => {
    setError(null);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (!isSending) {
      setIsOpen(false);
      setError(null);
    }
  }, [isSending]);

  const saveCredentials = useCallback(
    (ssid: string, password: string) => {
      setLastWifiCredentials(ssid, password);
    },
    [setLastWifiCredentials],
  );

  return {
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
  };
}
