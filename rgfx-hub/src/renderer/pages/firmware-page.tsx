import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  Upload as FlashIcon,
  Usb as UsbIcon,
  Wifi as WifiIcon,
} from '@mui/icons-material';
import { ESPLoader, Transport } from 'esptool-js';
import { useDriverStore } from '../store/driver-store';

type FlashMethod = 'usb' | 'ota';

interface PortInfo {
  port: SerialPort;
  info: SerialPortInfo;
  displayName: string;
}

interface FirmwareManifest {
  version: string;
  generatedAt: string;
  files: {
    name: string;
    address: number;
    size: number;
    sha256: string;
  }[];
}

// Convert ArrayBuffer to binary string (each byte becomes a char code)
function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return binary;
}

// Calculate SHA-256 hash of binary data
async function sha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const FirmwarePage: React.FC = () => {
  const [flashMethod, setFlashMethod] = useState<FlashMethod>('usb');
  const [availablePorts, setAvailablePorts] = useState<PortInfo[] | null>(null);
  const [selectedPortIndex, setSelectedPortIndex] = useState<number | ''>('');
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

  const drivers = useDriverStore((state) => state.drivers);

  const addLog = (message: string) => {
    setLogMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Reset ports when switching to USB mode
  useEffect(() => {
    if (flashMethod === 'usb') {
      setAvailablePorts(null);
      setSelectedPortIndex('');
    }
     
  }, [flashMethod]);

  const getPortDisplayName = (info: SerialPortInfo): string => {
    const vid = info.usbVendorId?.toString(16).padStart(4, '0') ?? 'unknown';
    const pid = info.usbProductId?.toString(16).padStart(4, '0') ?? 'unknown';

    let chipName = 'Unknown';
    if (info.usbVendorId === 0x10c4 && info.usbProductId === 0xea60) chipName = 'CP2102';
    else if (info.usbVendorId === 0x1a86 && info.usbProductId === 0x7523) chipName = 'CH340';
    else if (info.usbVendorId === 0x0403 && info.usbProductId === 0x6001) chipName = 'FTDI';

    return `${chipName} (VID=${vid} PID=${pid})`;
  };

  const refreshPorts = async (): Promise<number> => {
    try {
      setError(null);

      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser');
      }

      const ports = await navigator.serial.getPorts();
      const portsWithInfo: PortInfo[] = ports
        .map((port) => {
          const info = port.getInfo();
          return {
            port,
            info,
            displayName: getPortDisplayName(info),
          };
        })
        .filter((portInfo) => {
          // Filter out ports without valid USB vendor/product IDs
          return (
            portInfo.info.usbVendorId !== undefined && portInfo.info.usbProductId !== undefined
          );
        });

      setAvailablePorts(portsWithInfo);
      return portsWithInfo.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to scan ports: ${message}`);
      return 0;
    }
  };

  const requestNewPort = async () => {
    try {
      setError(null);
      addLog('Requesting access to new USB port...');

      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser');
      }

      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // CP2102
          { usbVendorId: 0x1a86, usbProductId: 0x7523 }, // CH340
          { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
          { usbVendorId: 0x303a }, // Espressif (ESP32-S2, S3, C3 native USB)
        ],
      });

      const portInfo = port.getInfo();
      addLog(`Port access granted: ${getPortDisplayName(portInfo)}`);

      await refreshPorts();
    } catch (err) {
      // User cancelled the dialog - not an error
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        addLog('Port selection cancelled');
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to request port: ${message}`);
      addLog(`Error: ${message}`);
    }
  };

  const flashViaUSB = async () => {
    if (selectedPortIndex === '' || !availablePorts?.[selectedPortIndex]) {
      setError('No port selected');
      return;
    }

    // Get the port info to match against
    const selectedPortInfo = availablePorts[selectedPortIndex].info;
    let selectedPort: SerialPort | undefined;

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
      const manifest = (await manifestResponse.json()) as FirmwareManifest;
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

      addLog('Getting fresh port reference...');
      addLog(`Looking for port with VID=${selectedPortInfo.usbVendorId?.toString(16)} PID=${selectedPortInfo.usbProductId?.toString(16)}`);

      // Get a fresh port reference from the browser
      const allPorts = await navigator.serial.getPorts();
      addLog(`Found ${allPorts.length} port(s) in browser`);

      // Find all matching ports and log them
      const matchingPorts = allPorts.filter(
        (p) =>
          p.getInfo().usbVendorId === selectedPortInfo.usbVendorId &&
          p.getInfo().usbProductId === selectedPortInfo.usbProductId
      );
      addLog(`Found ${matchingPorts.length} matching port(s)`);

      // If there are multiple matching ports, forget all but the first one
      if (matchingPorts.length > 1) {
        addLog('Multiple port references found, clearing extras...');
        for (let i = 1; i < matchingPorts.length; i++) {
          try {
            await matchingPorts[i].forget();
            addLog(`Forgot extra port reference ${i}`);
          } catch {
            addLog(`Failed to forget port reference ${i}`);
          }
        }
      }

      if (matchingPorts.length === 0) {
        throw new Error('Could not find selected port');
      }

      selectedPort = matchingPorts[0];

      // Log port state before opening
      addLog(`Port state before open: readable=${selectedPort.readable !== null}, writable=${selectedPort.writable !== null}`);
      if (selectedPort.readable) {
        addLog(`  readable.locked=${selectedPort.readable.locked}`);
      }
      if (selectedPort.writable) {
        addLog(`  writable.locked=${selectedPort.writable.locked}`);
      }

      // Ensure port is closed before passing to esptool-js (it will open it itself)
      if (selectedPort.readable !== null || selectedPort.writable !== null) {
        addLog('Port appears to be open, closing it first...');
        try {
          // Release locks on readable stream if it exists
          if (selectedPort.readable?.locked) {
            addLog('Releasing readable stream lock...');
            const reader = selectedPort.readable.getReader();
            reader.releaseLock();
          }

          // Release locks on writable stream if it exists
          if (selectedPort.writable?.locked) {
            addLog('Releasing writable stream lock...');
            const writer = selectedPort.writable.getWriter();
            writer.releaseLock();
          }

          await selectedPort.close();
          addLog('Port closed');
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch {
          addLog('Warning: Failed to close port, continuing anyway...');
        }
      }

      addLog('Initializing ESP loader (will open port)...');
      const transport = new Transport(selectedPort, true);
      const loader = new ESPLoader({
        transport,
        baudrate: 115200,
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
          const fileProgress = written / total;
          const overallProgress = ((fileIndex + fileProgress) / fileArray.length) * 100;
          setProgress(Math.round(overallProgress));
          if (written === total) {
            addLog(`File ${fileIndex + 1}/${fileArray.length} complete`);
          }
        },
      });

      addLog('Flash complete! Resetting device...');
      await loader.after('hard_reset', false);

      addLog('Firmware flashed successfully via USB!');
      setProgress(100);
      setResultModal({
        open: true,
        success: true,
        message: `Firmware v${firmwareVersion} flashed successfully! The device has been reset and is now running the new firmware.`,
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
      try {
        if (selectedPort?.readable) {
          await selectedPort.close();
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
      void flashViaUSB();
    } else {
      void flashViaOTA();
    }
  };

  const canFlash =
    (flashMethod === 'usb' && selectedPortIndex !== '' && Boolean(availablePorts?.[selectedPortIndex])) ||
    (flashMethod === 'ota' && selectedDriver !== '');

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
          Choose how to flash firmware to your RGFX driver.
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

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <Select<number | ''>
                  value={selectedPortIndex}
                  onChange={(e) => {
                    setSelectedPortIndex(e.target.value);
                  }}
                  onOpen={() => {
                    void (async () => {
                      addLog('Scanning for ports...');
                      const count = await refreshPorts();
                      addLog(`Found ${count} previously granted port(s)`);
                      if (count === 0) {
                        addLog('No granted ports - requesting access...');
                        void requestNewPort();
                      }
                    })();
                  }}
                  disabled={isFlashing}
                  displayEmpty
                  renderValue={(value) => {
                    if (value === '' || !availablePorts?.[value]) {
                      return <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Select a port...</span>;
                    }
                    return availablePorts[value].displayName;
                  }}
                >
                  {availablePorts?.map((portInfo, index) => (
                    <MenuItem key={index} value={index}>
                      {portInfo.displayName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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

            {availablePorts !== null && availablePorts.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No ports with granted access. Click the dropdown again and select your ESP32 device from the browser dialog.
              </Alert>
            )}
          </>
        )}

        {flashMethod === 'ota' && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Flash firmware to an already-configured driver over WiFi.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Select Driver</InputLabel>
                <Select
                  value={selectedDriver}
                  label="Select Driver"
                  onChange={(e) => {
                    setSelectedDriver(e.target.value);
                  }}
                  disabled={isFlashing}
                >
                  {drivers.map((driver) => (
                    <MenuItem key={driver.id} value={driver.id}>
                      {driver.id} ({driver.sysInfo?.ip ?? 'no IP'})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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

            {drivers.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No drivers connected. Make sure your drivers are powered on and connected to the
                network.
              </Alert>
            )}
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Flash Log
        </Typography>
        <List dense sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.default', borderRadius: 1 }}>
          {logMessages.length > 0 ? (
            logMessages.map((msg, idx) => (
              <ListItem key={idx}>
                <ListItemText
                  primary={msg}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                    },
                  }}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary="No log messages yet"
                slotProps={{
                  primary: {
                    variant: 'body2',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                  },
                }}
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <Dialog
        open={resultModal.open}
        onClose={() => { setResultModal({ ...resultModal, open: false }); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: resultModal.success ? 'success.main' : 'error.main',
          }}
        >
          {resultModal.success ? <SuccessIcon /> : <ErrorIcon />}
          {resultModal.success ? 'Flash Complete' : 'Flash Failed'}
        </DialogTitle>
        <DialogContent>
          <Typography>{resultModal.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setResultModal({ ...resultModal, open: false }); }}
            variant="contained"
            autoFocus
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FirmwarePage;
