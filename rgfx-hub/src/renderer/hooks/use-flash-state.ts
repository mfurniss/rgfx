/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { useState, useCallback } from 'react';
import type { DriverFlashStatus } from '../store/ui-store';

interface FlashState {
  progress: number;
  driverFlashStatus: Map<string, DriverFlashStatus>;
  logMessages: string[];
  error: string | null;
  resultModal: {
    open: boolean;
    success: boolean;
    message: string;
  };
}

interface FlashStateActions {
  setProgress: (progress: number) => void;
  setDriverFlashStatus: React.Dispatch<React.SetStateAction<Map<string, DriverFlashStatus>>>;
  addLog: (message: string) => void;
  clearLogs: () => void;
  setError: (error: string | null) => void;
  showResult: (success: boolean, message: string) => void;
  closeResult: () => void;
  resetForNewFlash: () => void;
}

type UseFlashStateReturn = FlashState & FlashStateActions;

/**
 * Hook to manage flash operation state
 * Extracts state management from FirmwarePage for better separation of concerns
 */
export function useFlashState(
  initialDriverFlashStatus = new Map<string, DriverFlashStatus>(),
): UseFlashStateReturn {
  const [progress, setProgress] = useState(0);
  const [driverFlashStatus, setDriverFlashStatus] = useState(
    () => new Map<string, DriverFlashStatus>(initialDriverFlashStatus),
  );
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    success: boolean;
    message: string;
  }>({ open: false, success: false, message: '' });

  const addLog = useCallback((message: string) => {
    console.log('>', message);
    setLogMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogMessages([]);
  }, []);

  const showResult = useCallback((success: boolean, message: string) => {
    setResultModal({ open: true, success, message });
  }, []);

  const closeResult = useCallback(() => {
    setResultModal((prev) => ({ ...prev, open: false }));
  }, []);

  const resetForNewFlash = useCallback(() => {
    setError(null);
    setProgress(0);
    setLogMessages([]);
  }, []);

  return {
    // State
    progress,
    driverFlashStatus,
    logMessages,
    error,
    resultModal,
    // Actions
    setProgress,
    setDriverFlashStatus,
    addLog,
    clearLogs,
    setError,
    showResult,
    closeResult,
    resetForNewFlash,
  };
}
