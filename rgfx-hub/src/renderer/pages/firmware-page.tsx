/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  LinearProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import LogDisplay from '../components/common/log-display';
import FlashResultDialog from '../components/firmware/flash-result-dialog';
import ConfirmFlashDialog from '../components/firmware/confirm-flash-dialog';
import SerialPortSelector from '../components/firmware/serial-port-selector';
import WifiConfigButton from '../components/firmware/wifi-config-button';
import WifiConfigOtaButton from '../components/firmware/wifi-config-ota-button';
import { TargetDriversPicker } from '../components/driver/target-drivers-picker';
import SuperButton from '../components/common/super-button';
import {
  Upload as FlashIcon,
  Usb as UsbIcon,
  Wifi as WifiIcon,
  Memory as FirmwareIcon,
} from '@mui/icons-material';
import { PageTitle } from '../components/layout/page-title';
import { useDriverStore } from '../store/driver-store';
import { useSystemStatusStore } from '../store/system-status-store';
import { useUiStore, type FlashMethod, type DriverFlashStatus } from '../store/ui-store';
import { useFlashState } from '../hooks/use-flash-state';
import { flashViaUSB } from '../services/usb-flash-service';
import {
  flashViaOTA,
  getDriversToFlash,
  generateResultMessage,
} from '../services/ota-flash-service';

const FirmwarePage: React.FC = () => {
  // Driver store
  const drivers = useDriverStore((state) => state.drivers);
  const currentFirmwareVersion = useSystemStatusStore(
    (state) => state.systemStatus.currentFirmwareVersion,
  );
  const connectedDrivers = drivers.filter((d) => d.state === 'connected');
  const driversNeedingUpdate = connectedDrivers.filter(
    (d) =>
      d.telemetry?.firmwareVersion &&
      d.telemetry.firmwareVersion !== currentFirmwareVersion,
  );

  // Persisted state from store
  const storedFlashMethod = useUiStore((state) => state.firmwareFlashMethod);
  const storedDriverFlashStatus = useUiStore((state) => state.firmwareDriverFlashStatus);
  const setFirmwareState = useUiStore((state) => state.setFirmwareState);
  const setFirmwareDriverFlashStatus = useUiStore((state) => state.setFirmwareDriverFlashStatus);
  const isFlashing = useUiStore((state) => state.isFlashingFirmware);
  const setIsFlashing = useUiStore((state) => state.setIsFlashingFirmware);

  // Flash state from hook
  const flashState = useFlashState(new Map(Object.entries(storedDriverFlashStatus)));

  // Local UI state
  const [flashMethod, setFlashMethod] = useState<FlashMethod>(storedFlashMethod);
  const [getPort, setGetPort] = useState<(() => Promise<SerialPort>) | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(
    () => new Set(driversNeedingUpdate.map((d) => d.id)),
  );
  const [selectAll, setSelectAll] = useState(
    () => driversNeedingUpdate.length === connectedDrivers.length && connectedDrivers.length > 0,
  );
  const [confirmModal, setConfirmModal] = useState(false);

  // Subscribe to OTA flash events
  useEffect(() => {
    const unsubscribeState = window.rgfx.onFlashOtaState(
      ({ driverId, state }: { driverId: string; state: string }): void => {
        flashState.addLog(`[${driverId}] OTA state: ${state}`);
      },
    );

    const unsubscribeProgress = window.rgfx.onFlashOtaProgress(
      (progressData: {
        driverId: string;
        sent: number;
        total: number;
        percent: number;
      }): void => {
        const { driverId, percent, sent, total } = progressData;

        flashState.setDriverFlashStatus((prev) => {
          const next = new Map(prev);
          const current = next.get(driverId);

          if (current) {
            next.set(driverId, { ...current, progress: percent, status: 'flashing' });
          }
          return next;
        });
        flashState.addLog(`[${driverId}] OTA progress: ${percent}% (${sent}/${total} bytes)`);
      },
    );

    return (): void => {
      unsubscribeState();
      unsubscribeProgress();
    };
  }, [flashState]);

  // Reset port selection when switching methods
  useEffect(() => {
    if (flashMethod === 'usb') {
      setGetPort(null);
    }
  }, [flashMethod]);

  // Sync state changes to store for persistence across navigation
  useEffect(() => {
    setFirmwareState(flashMethod, Array.from(selectedDrivers), selectAll);
  }, [flashMethod, selectedDrivers, selectAll, setFirmwareState]);

  // Sync driver flash status to store
  useEffect(() => {
    setFirmwareDriverFlashStatus(Object.fromEntries(flashState.driverFlashStatus));
  }, [flashState.driverFlashStatus, setFirmwareDriverFlashStatus]);

  const handlePortSelect = (portGetter: (() => Promise<SerialPort>) | null) => {
    setGetPort(() => portGetter);
  };

  const handleFlashViaUSB = async () => {
    if (!getPort) {
      flashState.setError('No port selected');
      return;
    }

    setIsFlashing(true);
    flashState.resetForNewFlash();

    const result = await flashViaUSB(getPort, {
      onLog: flashState.addLog,
      onProgress: flashState.setProgress,
    });

    if (result.success) {
      flashState.setProgress(100);
      flashState.showResult(
        true,
        `Firmware v${result.firmwareVersion} flashed successfully! The device has been reset.`,
      );
    } else {
      flashState.setError(`Flash failed: ${result.error}`);
      flashState.showResult(false, `Flash failed: ${result.error}`);
    }

    setIsFlashing(false);
  };

  const handleFlashViaOTA = async () => {
    if (selectedDrivers.size === 0) {
      flashState.setError('No drivers selected');
      return;
    }

    const driversToFlash = getDriversToFlash(selectedDrivers, drivers);

    if (driversToFlash.length === 0) {
      flashState.setError('No connected drivers selected');
      return;
    }

    if (!currentFirmwareVersion) {
      flashState.setError('Firmware version not available');
      return;
    }

    setIsFlashing(true);
    flashState.resetForNewFlash();

    try {
      const result = await flashViaOTA(driversToFlash, currentFirmwareVersion, {
        onLog: flashState.addLog,
        onDriverStatusChange: (driverId: string, status: DriverFlashStatus) => {
          flashState.setDriverFlashStatus((prev) => {
            const next = new Map(prev);
            next.set(driverId, status);
            return next;
          });
        },
      });

      flashState.setProgress(100);
      const { success, message } = generateResultMessage(result, currentFirmwareVersion);
      flashState.showResult(success, message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      flashState.setError(`OTA flash failed: ${message}`);
      flashState.showResult(false, `OTA flash failed: ${message}`);
    } finally {
      setIsFlashing(false);
    }
  };

  const handleFlash = () => {
    setConfirmModal(true);
  };

  const handleConfirmFlash = () => {
    setConfirmModal(false);

    if (flashMethod === 'usb') {
      void handleFlashViaUSB();
    } else {
      void handleFlashViaOTA();
    }
  };

  const handleDriverToggle = (driverId: string) => {
    const newSelected = new Set(selectedDrivers);

    if (newSelected.has(driverId)) {
      newSelected.delete(driverId);
    } else {
      newSelected.add(driverId);
    }
    setSelectedDrivers(newSelected);
    setSelectAll(newSelected.size === connectedDrivers.length && connectedDrivers.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDrivers(new Set());
      setSelectAll(false);
    } else {
      setSelectedDrivers(new Set(connectedDrivers.map((d) => d.id)));
      setSelectAll(true);
    }
  };

  const canFlash =
    (flashMethod === 'usb' && getPort !== null) ||
    (flashMethod === 'ota' && selectedDrivers.size > 0);

  return (
    <Box>
      <PageTitle icon={<FirmwareIcon />} title="Firmware" />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Update Method
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose how to update RGFX Driver firmware on your ESP32 device(s).
        </Typography>

        <ToggleButtonGroup
          value={flashMethod}
          exclusive
          onChange={(_event, newMethod: FlashMethod | null) => {
            if (newMethod !== null) {
              setFlashMethod(newMethod);
              flashState.setError(null);
            }
          }}
          fullWidth
          sx={{ mb: 3 }}
          disabled={isFlashing}
        >
          <ToggleButton value="ota">
            <WifiIcon sx={{ mr: 1 }} />
            OTA WiFi
          </ToggleButton>
          <ToggleButton value="usb">
            <UsbIcon sx={{ mr: 1 }} />
            USB Serial
          </ToggleButton>
        </ToggleButtonGroup>

        {flashMethod === 'ota' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Update firmware on already-configured drivers over WiFi. Multiple drivers can be
              updated in parallel.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <TargetDriversPicker
                drivers={drivers}
                selectedDrivers={selectedDrivers}
                selectAll={selectAll}
                onDriverToggle={handleDriverToggle}
                onSelectAll={handleSelectAll}
                disabled={isFlashing}
              />

              <SuperButton
                variant="contained"
                icon={<FlashIcon />}
                onClick={() => {
                  handleFlash();
                }}
                disabled={!canFlash}
                busy={isFlashing}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {isFlashing ? 'Updating...' : 'Update Firmware'}
              </SuperButton>

              <WifiConfigOtaButton
                drivers={drivers}
                selectedDrivers={selectedDrivers}
                disabled={isFlashing}
                onLog={flashState.addLog}
              />
            </Box>
          </>
        )}

        {flashMethod === 'usb' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect a new ESP32 or existing driver via USB cable.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <SerialPortSelector
                  disabled={isFlashing}
                  onPortSelect={handlePortSelect}
                  onLog={flashState.addLog}
                  onError={flashState.setError}
                />
              </Box>

              <SuperButton
                variant="contained"
                icon={<FlashIcon />}
                onClick={() => {
                  handleFlash();
                }}
                disabled={!canFlash}
                busy={isFlashing}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {isFlashing ? 'Updating...' : 'Update Firmware'}
              </SuperButton>

              <WifiConfigButton getPort={getPort} disabled={isFlashing} onLog={flashState.addLog} />
            </Box>
          </>
        )}

        {flashState.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {flashState.error}
          </Alert>
        )}

        {isFlashing && flashMethod === 'usb' && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={flashState.progress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {flashState.progress}%
            </Typography>
          </Box>
        )}

        {isFlashing && flashMethod === 'ota' && flashState.driverFlashStatus.size > 0 && (
          <Box sx={{ mt: 2 }}>
            {Array.from(flashState.driverFlashStatus.entries()).map(([driverId, status]) => (
              <Box key={driverId} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ minWidth: 120 }}>
                    {driverId}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={
                      status.status === 'success'
                        ? 'success.main'
                        : status.status === 'error'
                          ? 'error.main'
                          : 'text.secondary'
                    }
                    sx={{ minWidth: 60 }}
                  >
                    {status.status === 'pending' && 'Waiting...'}
                    {status.status === 'flashing' && `${status.progress}%`}
                    {status.status === 'success' && 'Done'}
                    {status.status === 'error' && 'Failed'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={status.progress}
                  color={
                    status.status === 'success'
                      ? 'success'
                      : status.status === 'error'
                        ? 'error'
                        : 'primary'
                  }
                />
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <LogDisplay messages={flashState.logMessages} />

      <FlashResultDialog
        open={flashState.resultModal.open}
        success={flashState.resultModal.success}
        message={flashState.resultModal.message}
        onClose={() => {
          flashState.closeResult();
        }}
      />

      <ConfirmFlashDialog
        open={confirmModal}
        firmwareVersion={currentFirmwareVersion ?? ''}
        flashMethod={flashMethod}
        onConfirm={handleConfirmFlash}
        onCancel={() => {
          setConfirmModal(false);
        }}
      />
    </Box>
  );
};

export default FirmwarePage;
