import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  LinearProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import LogDisplay from '../components/log-display';
import FlashResultDialog from '../components/flash-result-dialog';
import ConfirmFlashDialog from '../components/confirm-flash-dialog';
import SerialPortSelector from '../components/serial-port-selector';
import OtaDriverSelector from '../components/ota-driver-selector';
import { Upload as FlashIcon, Usb as UsbIcon, Wifi as WifiIcon } from '@mui/icons-material';
import { ESPLoader, Transport } from 'esptool-js';
import { useDriverStore } from '../store/driver-store';
import { arrayBufferToBinaryString, sha256 } from '../utils/binary';
import { FirmwareManifestSchema, type FirmwareManifest } from '../../schemas';

type FlashMethod = 'usb' | 'ota';

const FirmwarePage: React.FC = () => {
  const [flashMethod, setFlashMethod] = useState<FlashMethod>('usb');
  const [getPort, setGetPort] = useState<(() => Promise<SerialPort>) | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    success: boolean;
    message: string;
  }>({ open: false, success: false, message: '' });
  const [confirmModal, setConfirmModal] = useState(false);

  const drivers = useDriverStore((state) => state.drivers);

  const addLog = (message: string) => {
    console.log('>', message);
    setLogMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Subscribe to OTA flash events
  useEffect(() => {
    const unsubscribeState = window.rgfx.onFlashOtaState((state: string): void => {
      addLog(`OTA state: ${state}`);
    });

    const unsubscribeProgress = window.rgfx.onFlashOtaProgress(
      (progressData: { sent: number; total: number; percent: number }): void => {
        setProgress(progressData.percent);
        addLog(
          `OTA progress: ${progressData.percent}% (${progressData.sent}/${progressData.total} bytes)`
        );
      }
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

      // Load firmware manifest
      addLog('Loading firmware manifest...');
      const manifestResponse = await fetch('/esp32/firmware/manifest.json');

      if (!manifestResponse.ok) {
        throw new Error('Failed to load firmware manifest');
      }
      const manifestJson: unknown = await manifestResponse.json();
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
        const response = await fetch(`/esp32/firmware/${fileInfo.name}`);

        if (!response.ok) {
          throw new Error(`Failed to load ${fileInfo.name}`);
        }

        const buffer = await response.arrayBuffer();

        // Verify size
        if (buffer.byteLength !== fileInfo.size) {
          throw new Error(
            `Size mismatch for ${fileInfo.name}: expected ${fileInfo.size}, got ${buffer.byteLength}`
          );
        }

        // Verify checksum
        const checksum = await sha256(buffer);

        if (checksum !== fileInfo.sha256) {
          throw new Error(
            `Checksum mismatch for ${fileInfo.name}: expected ${fileInfo.sha256.substring(0, 16)}..., got ${checksum.substring(0, 16)}...`
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
        0
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
    if (!selectedDriver) {
      setError('No driver selected');
      return;
    }

    try {
      setIsFlashing(true);
      setError(null);
      setProgress(0);
      setLogMessages([]);

      // Fetch firmware version
      let firmwareVersion = 'unknown';

      try {
        const versionResponse = await fetch('/esp32/firmware/version.json');

        if (versionResponse.ok) {
          const versionData = (await versionResponse.json()) as { version: string };
          firmwareVersion = versionData.version;
          addLog(`Firmware version: ${firmwareVersion}`);
        }
      } catch {
        addLog('Warning: Could not fetch firmware version');
      }

      const driver = drivers.find((d) => d.id === selectedDriver);

      if (!driver) {
        throw new Error('Selected driver not found');
      }

      addLog(`Starting OTA flash to ${driver.id}...`);
      addLog(`Driver hostname: ${driver.id}.local`);

      const result = await window.rgfx.flashOTA(driver.id);

      if (result.success) {
        addLog('Firmware flashed successfully via OTA!');
        setProgress(100);
        setResultModal({
          open: true,
          success: true,
          message: `Firmware v${firmwareVersion} flashed successfully via OTA! The driver has been reset and is now running the new firmware.`,
        });
      } else {
        throw new Error(result.error ?? 'Unknown OTA flash error');
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
    if (flashMethod === 'usb') {
      setConfirmModal(true);
    } else {
      void flashViaOTA();
    }
  };

  const handleConfirmFlash = () => {
    setConfirmModal(false);
    void flashViaUSB();
  };

  const canFlash =
    (flashMethod === 'usb' && getPort !== null) || (flashMethod === 'ota' && selectedDriver !== '');

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Firmware Management
      </Typography>

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
          <ToggleButton value="usb">
            <UsbIcon sx={{ mr: 1 }} />
            USB Serial
          </ToggleButton>
          <ToggleButton value="ota">
            <WifiIcon sx={{ mr: 1 }} />
            OTA WiFi
          </ToggleButton>
        </ToggleButtonGroup>

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

              <Button
                variant="contained"
                startIcon={<FlashIcon />}
                onClick={() => {
                  handleFlash();
                }}
                disabled={!canFlash || isFlashing}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {isFlashing ? 'Flashing...' : 'Flash via USB'}
              </Button>
            </Box>
          </>
        )}

        {flashMethod === 'ota' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Flash firmware to an already-configured driver over WiFi.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <OtaDriverSelector
                  drivers={drivers}
                  selectedDriver={selectedDriver}
                  onDriverSelect={setSelectedDriver}
                  disabled={isFlashing}
                />
              </Box>

              <Button
                variant="contained"
                startIcon={<FlashIcon />}
                onClick={() => {
                  handleFlash();
                }}
                disabled={!canFlash || isFlashing}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {isFlashing ? 'Flashing...' : 'Flash via OTA'}
              </Button>
            </Box>
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isFlashing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {progress}%
            </Typography>
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
        onConfirm={handleConfirmFlash}
        onCancel={() => {
          setConfirmModal(false);
        }}
      />
    </Box>
  );
};

export default FirmwarePage;
