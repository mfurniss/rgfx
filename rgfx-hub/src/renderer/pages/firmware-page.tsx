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
import LogDisplay from '../components/log-display';
import FlashResultDialog from '../components/flash-result-dialog';
import ConfirmFlashDialog from '../components/confirm-flash-dialog';
import SerialPortSelector from '../components/serial-port-selector';
import { TargetDriversPicker } from '../components/target-drivers-picker';
import SuperButton from '../components/super-button';
import { Upload as FlashIcon, Usb as UsbIcon, Wifi as WifiIcon, Memory as FirmwareIcon } from '@mui/icons-material';
import { PageTitle } from '../components/page-title';
import { ESPLoader, Transport } from 'esptool-js';
import { useDriverStore } from '../store/driver-store';
import { useUiStore, type FlashMethod, type DriverFlashStatus } from '../store/ui-store';
import { arrayBufferToBinaryString, sha256 } from '../utils/binary';
import { FirmwareManifestSchema, type FirmwareManifest } from '@/schemas';

const FirmwarePage: React.FC = () => {
  // Persisted state from store
  const storedFlashMethod = useUiStore((state) => state.firmwareFlashMethod);
  const storedSelectedDrivers = useUiStore((state) => state.firmwareSelectedDrivers);
  const storedSelectAll = useUiStore((state) => state.firmwareSelectAll);
  const storedDriverFlashStatus = useUiStore((state) => state.firmwareDriverFlashStatus);
  const setFirmwareState = useUiStore((state) => state.setFirmwareState);
  const setFirmwareDriverFlashStatus = useUiStore((state) => state.setFirmwareDriverFlashStatus);

  // Local state initialized from store
  const [flashMethod, setFlashMethod] = useState<FlashMethod>(storedFlashMethod);
  const [getPort, setGetPort] = useState<(() => Promise<SerialPort>) | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(
    new Set(storedSelectedDrivers),
  );
  const [selectAll, setSelectAll] = useState(storedSelectAll);
  const isFlashing = useUiStore((state) => state.isFlashingFirmware);
  const setIsFlashing = useUiStore((state) => state.setIsFlashingFirmware);
  const [progress, setProgress] = useState(0);
  const [driverFlashStatus, setDriverFlashStatus] = useState<Map<string, DriverFlashStatus>>(
    () => new Map(Object.entries(storedDriverFlashStatus)),
  );
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    success: boolean;
    message: string;
  }>({ open: false, success: false, message: '' });
  const [confirmModal, setConfirmModal] = useState(false);

  const drivers = useDriverStore((state) => state.drivers);
  const currentFirmwareVersion = useDriverStore(
    (state) => state.systemStatus.currentFirmwareVersion,
  );
  const connectedDrivers = drivers.filter((d) => d.connected);

  const addLog = (message: string) => {
    console.log('>', message);
    setLogMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Subscribe to OTA flash events
  useEffect(() => {
    const unsubscribeState = window.rgfx.onFlashOtaState(
      ({ driverId, state }: { driverId: string; state: string }): void => {
        addLog(`[${driverId}] OTA state: ${state}`);
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

        setDriverFlashStatus((prev) => {
          const next = new Map(prev);
          const current = next.get(driverId);

          if (current) {
            next.set(driverId, { ...current, progress: percent, status: 'flashing' });
          }
          return next;
        });
        addLog(`[${driverId}] OTA progress: ${percent}% (${sent}/${total} bytes)`);
      },
    );

    return (): void => {
      unsubscribeState();
      unsubscribeProgress();
    };
  }, []);

  // Reset port selection when switching methods
  useEffect(() => {
    if (flashMethod === 'usb') {
      setGetPort(null);
    }
  }, [flashMethod]);

  // Auto-select drivers that need firmware update (only on initial mount if no stored selection)
  useEffect(() => {
    // Skip if we have stored selections (user navigated away and back)
    if (storedSelectedDrivers.length > 0) {
      return;
    }

    if (!currentFirmwareVersion) {
      return;
    }

    const connected = drivers.filter((d) => d.connected);
    const driversNeedingUpdate = connected.filter(
      (d) =>
        d.telemetry?.firmwareVersion &&
        d.telemetry.firmwareVersion !== currentFirmwareVersion,
    );

    if (driversNeedingUpdate.length > 0) {
      setSelectedDrivers(new Set(driversNeedingUpdate.map((d) => d.id)));
      setSelectAll(driversNeedingUpdate.length === connected.length);
    }
    // Only run on mount - don't re-select when drivers change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state changes to store for persistence across navigation
  useEffect(() => {
    setFirmwareState(flashMethod, Array.from(selectedDrivers), selectAll);
  }, [flashMethod, selectedDrivers, selectAll, setFirmwareState]);

  // Sync driver flash status to store
  useEffect(() => {
    setFirmwareDriverFlashStatus(Object.fromEntries(driverFlashStatus));
  }, [driverFlashStatus, setFirmwareDriverFlashStatus]);

  const handlePortSelect = (portGetter: (() => Promise<SerialPort>) | null) => {
    setGetPort(() => portGetter);
  };

  const flashViaUSB = async () => {
    if (!getPort) {
      setError('No port selected');
      return;
    }

    let portToFlash: SerialPort | undefined;
    let transport: Transport | null = null;

    try {
      setIsFlashing(true);
      setError(null);
      setProgress(0);
      setLogMessages([]);

      // Load firmware manifest via IPC
      addLog('Loading firmware manifest...');
      const manifestJson: unknown = await window.rgfx.getFirmwareManifest();
      const manifestResult = FirmwareManifestSchema.safeParse(manifestJson);

      if (!manifestResult.success) {
        throw new Error(`Invalid firmware manifest: ${manifestResult.error.message}`);
      }
      const manifest: FirmwareManifest = manifestResult.data;
      const firmwareVersion = manifest.version;
      addLog(`Firmware version: ${firmwareVersion}`);
      addLog(`Files to flash: ${manifest.files.length}`);

      // Load and verify firmware files
      addLog('Loading and verifying firmware files...');
      const fileArray: { data: string; address: number }[] = [];

      for (const fileInfo of manifest.files) {
        // Load firmware file via IPC (returns Node.js Buffer)
        const nodeBuffer = await window.rgfx.getFirmwareFile(fileInfo.name);
        // Convert Node.js Buffer to Uint8Array then to ArrayBuffer
        const uint8Array = new Uint8Array(nodeBuffer);
        const { buffer } = uint8Array;

        // Verify size
        if (buffer.byteLength !== fileInfo.size) {
          throw new Error(
            `Size mismatch for ${fileInfo.name}: expected ${fileInfo.size}, got ${buffer.byteLength}`,
          );
        }

        // Verify checksum
        const checksum = await sha256(buffer);

        if (checksum !== fileInfo.sha256) {
          throw new Error(
            `Checksum mismatch for ${fileInfo.name}: expected ${fileInfo.sha256.substring(0, 16)}..., got ${checksum.substring(0, 16)}...`,
          );
        }

        addLog(`  ✓ ${fileInfo.name} (${fileInfo.size} bytes, checksum verified)`);

        // Convert to binary string for esptool-js
        const binaryString = arrayBufferToBinaryString(buffer);
        fileArray.push({
          data: binaryString,
          address: fileInfo.address,
        });
      }

      addLog('All files verified successfully');

      // Find the largest file (app binary) for progress reporting
      const largestFileIndex = fileArray.reduce(
        (maxIdx, file, idx, arr) => (file.data.length > arr[maxIdx].data.length ? idx : maxIdx),
        0,
      );

      // Get fresh, clean port from selector
      portToFlash = await getPort();

      addLog('Initializing ESP loader (will open port)...');
      transport = new Transport(portToFlash, true);

      const loader = new ESPLoader({
        transport,
        baudrate: 921600,
        romBaudrate: 115200,
        terminal: {
          clean() {
            // Terminal clean
          },
          writeLine(data: string) {
            // Filter out verbose logs
            if (
              data.startsWith('TRACE') ||
              data.startsWith('Write bytes') ||
              data.includes('bytes:') ||
              /^\s*[0-9a-f]{16}\s+[0-9a-f]{16}\s+\|/.test(data) // hex dump lines
            ) {
              return;
            }
            addLog(data);
          },
          write(data: string) {
            // Filter out verbose logs
            if (
              data.startsWith('TRACE') ||
              data.startsWith('Write bytes') ||
              data.includes('bytes:') ||
              /^\s*[0-9a-f]{16}\s+[0-9a-f]{16}\s+\|/.test(data) // hex dump lines
            ) {
              return;
            }
            addLog(data);
          },
        },
      });

      addLog('Connecting to device...');
      const chip = await loader.main();
      addLog(`Connected to ${chip}`);

      addLog('Starting flash operation...');
      await loader.writeFlash({
        fileArray,
        flashSize: 'keep',
        flashMode: 'dio',
        flashFreq: '40m',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          // Only report progress for the largest file (app binary)
          if (fileIndex === largestFileIndex) {
            const progressPct = (written / total) * 100;
            setProgress(Math.round(progressPct));
          }

          if (written === total) {
            addLog(`File ${fileIndex + 1}/${fileArray.length} complete`);
          }
        },
      });

      addLog('Flash complete! Resetting device...');

      // Manual hard reset with proper timing
      // RTS is active-low and connected to EN via transistor circuit
      // Setting RTS true (active) pulls EN low (chip in reset)
      // Setting RTS false (inactive) releases EN high (chip boots)
      await portToFlash.setSignals({ requestToSend: true });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await portToFlash.setSignals({ requestToSend: false });
      await new Promise((resolve) => setTimeout(resolve, 50));

      addLog('Device reset complete');
      addLog('Firmware flashed successfully via USB!');
      setProgress(100);
      setResultModal({
        open: true,
        success: true,
        message: `Firmware v${firmwareVersion} flashed successfully! The device has been reset.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Flash failed: ${message}`);
      addLog(`Error: ${message}`);
      setResultModal({
        open: true,
        success: false,
        message: `Flash failed: ${message}`,
      });
    } finally {
      // Clean up transport and port to release serial port lock
      try {
        if (transport) {
          addLog('Disconnecting transport...');
          await transport.disconnect();
        }
      } catch {
        // Ignore disconnect errors
      }

      try {
        if (portToFlash) {
          // Check if port is still open before closing
          if (portToFlash.readable || portToFlash.writable) {
            addLog('Closing serial port...');
            await portToFlash.close();
            addLog('Serial port closed');
          }
        }
      } catch {
        // Ignore close errors
      }
      setIsFlashing(false);
    }
  };

  const flashViaOTA = async () => {
    if (selectedDrivers.size === 0) {
      setError('No drivers selected');
      return;
    }

    const driversToFlash = Array.from(selectedDrivers)
      .map((id) => drivers.find((d) => d.id === id))
      .filter((d): d is (typeof drivers)[0] => d?.connected === true);

    if (driversToFlash.length === 0) {
      setError('No connected drivers selected');
      return;
    }

    try {
      setIsFlashing(true);
      setError(null);
      setProgress(0);
      setLogMessages([]);

      // Initialize status for all drivers
      const initialStatus = new Map<string, DriverFlashStatus>();
      driversToFlash.forEach((d) => {
        initialStatus.set(d.id, { status: 'pending', progress: 0 });
      });
      setDriverFlashStatus(initialStatus);

      if (!currentFirmwareVersion) {
        throw new Error('Firmware version not available');
      }
      addLog(`Firmware version: ${currentFirmwareVersion}`);

      addLog(`Starting OTA flash to ${driversToFlash.length} driver(s) in parallel...`);
      driversToFlash.forEach((driver) => {
        addLog(`  - ${driver.id} (${driver.ip})`);
      });

      // Flash all drivers in parallel
      const results = await Promise.allSettled(
        driversToFlash.map(async (driver) => {
          setDriverFlashStatus((prev) => {
            const next = new Map(prev);
            next.set(driver.id, { status: 'flashing', progress: 0 });
            return next;
          });

          const result = await window.rgfx.flashOTA(driver.id);

          if (result.success) {
            setDriverFlashStatus((prev) => {
              const next = new Map(prev);
              next.set(driver.id, { status: 'success', progress: 100 });
              return next;
            });
            addLog(`[${driver.id}] Firmware flashed successfully!`);
            return { driverId: driver.id, success: true };
          } else {
            const errorMsg = result.error ?? 'Unknown error';
            setDriverFlashStatus((prev) => {
              const next = new Map(prev);
              next.set(driver.id, { status: 'error', progress: 0, error: errorMsg });
              return next;
            });
            addLog(`[${driver.id}] Flash failed: ${errorMsg}`);
            return { driverId: driver.id, success: false, error: errorMsg };
          }
        }),
      );

      // Process results
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success,
      ).length;
      const failedResults = results.filter(
        (r) => r.status === 'rejected' || !r.value.success,
      );

      setProgress(100);

      if (failedResults.length === 0) {
        setResultModal({
          open: true,
          success: true,
          message: `Firmware v${currentFirmwareVersion} flashed successfully to ${successCount} driver(s)!`,
        });
      } else if (successCount > 0) {
        const failedDrivers = failedResults
          .map((r) => {
            if (r.status === 'fulfilled') {
              return `${r.value.driverId}: ${r.value.error}`;
            }
            return `Unknown: ${r.reason}`;
          })
          .join('\n');
        setResultModal({
          open: true,
          success: false,
          message: `Partial success: ${successCount} of ${driversToFlash.length} driver(s) flashed.\n\nFailed:\n${failedDrivers}`,
        });
      } else {
        const failedDrivers = failedResults
          .map((r) => {
            if (r.status === 'fulfilled') {
              return `${r.value.driverId}: ${r.value.error}`;
            }
            return `Unknown: ${r.reason}`;
          })
          .join('\n');
        setResultModal({
          open: true,
          success: false,
          message: `OTA flash failed for all drivers:\n${failedDrivers}`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`OTA flash failed: ${message}`);
      addLog(`Error: ${message}`);
      setResultModal({
        open: true,
        success: false,
        message: `OTA flash failed: ${message}`,
      });
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
      void flashViaUSB();
    } else {
      void flashViaOTA();
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
          Flash Method
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose how to flash RGFX Driver firmware to your ESP32 device(s).
        </Typography>

        <ToggleButtonGroup
          value={flashMethod}
          exclusive
          onChange={(_event, newMethod: FlashMethod | null) => {
            if (newMethod !== null) {
              setFlashMethod(newMethod);
              setError(null);
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
              Flash firmware to already-configured drivers over WiFi. Multiple drivers can be
              flashed in parallel.
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
                {isFlashing ? 'Flashing...' : 'Flash via OTA'}
              </SuperButton>
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
                  onLog={addLog}
                  onError={setError}
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
                {isFlashing ? 'Flashing...' : 'Flash via USB'}
              </SuperButton>
            </Box>
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isFlashing && flashMethod === 'usb' && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {progress}%
            </Typography>
          </Box>
        )}

        {isFlashing && flashMethod === 'ota' && driverFlashStatus.size > 0 && (
          <Box sx={{ mt: 2 }}>
            {Array.from(driverFlashStatus.entries()).map(([driverId, status]) => (
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

      <LogDisplay messages={logMessages} />

      <FlashResultDialog
        open={resultModal.open}
        success={resultModal.success}
        message={resultModal.message}
        onClose={() => {
          setResultModal({ ...resultModal, open: false });
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
