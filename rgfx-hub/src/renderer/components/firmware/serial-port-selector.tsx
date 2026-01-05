import React, { useState } from 'react';
import { Box, FormControl, Select, MenuItem, Alert } from '@mui/material';

interface PortInfo {
  port: SerialPort;
  info: SerialPortInfo;
  displayName: string;
}

interface SerialPortSelectorProps {
  disabled: boolean;
  onPortSelect: (getPort: (() => Promise<SerialPort>) | null) => void;
  onLog: (message: string) => void;
  onError: (error: string | null) => void;
}

function getPortDisplayName(info: SerialPortInfo): string {
  const vid = info.usbVendorId?.toString(16).toUpperCase().padStart(4, '0') ?? '????';
  const pid = info.usbProductId?.toString(16).toUpperCase().padStart(4, '0') ?? '????';

  let chipName = 'Unknown USB Serial';

  if (info.usbVendorId === 0x10c4 && info.usbProductId === 0xea60) {
    chipName = 'CP2102 USB to UART Bridge';
  } else if (info.usbVendorId === 0x1a86 && info.usbProductId === 0x7523) {
    chipName = 'CH340 USB to Serial';
  } else if (info.usbVendorId === 0x0403 && info.usbProductId === 0x6001) {
    chipName = 'FTDI USB to Serial';
  } else if (info.usbVendorId === 0x303a) {
    chipName = 'Espressif ESP32 Native USB';
  }

  return `${chipName} [${vid}:${pid}]`;
}

const SerialPortSelector: React.FC<SerialPortSelectorProps> = ({
  disabled,
  onPortSelect,
  onLog,
  onError,
}) => {
  const [availablePorts, setAvailablePorts] = useState<PortInfo[] | null>(null);
  const [selectedPortIndex, setSelectedPortIndex] = useState<number | ''>('');

  const refreshPorts = async (): Promise<number> => {
    try {
      onError(null);

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
          return (
            portInfo.info.usbVendorId !== undefined && portInfo.info.usbProductId !== undefined
          );
        });

      setAvailablePorts(portsWithInfo);
      return portsWithInfo.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onError(`Failed to scan ports: ${message}`);
      return 0;
    }
  };

  const requestNewPort = async () => {
    try {
      onError(null);
      onLog('Requesting access to new USB port...');

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
      onLog(`Port access granted: ${getPortDisplayName(portInfo)}`);

      await refreshPorts();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        onLog('Port selection cancelled');
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      onError(`Failed to request port: ${message}`);
      onLog(`Error: ${message}`);
    }
  };

  const handlePortChange = (index: number | '') => {
    setSelectedPortIndex(index);

    if (index !== '' && availablePorts?.[index]) {
      const selectedInfo = availablePorts[index].info;

      // Return a function that gets a fresh, clean port reference
      const getPort = async (): Promise<SerialPort> => {
        onLog('Getting fresh port reference...');
        onLog(`Looking for port with VID=${selectedInfo.usbVendorId?.toString(16)} PID=${selectedInfo.usbProductId?.toString(16)}`);

        const allPorts = await navigator.serial.getPorts();
        onLog(`Found ${allPorts.length} port(s) in browser`);

        // Find all matching ports
        const matchingPorts = allPorts.filter(
          (p) =>
            p.getInfo().usbVendorId === selectedInfo.usbVendorId &&
            p.getInfo().usbProductId === selectedInfo.usbProductId,
        );
        onLog(`Found ${matchingPorts.length} matching port(s)`);

        // If there are multiple matching ports, forget all but the first one
        if (matchingPorts.length > 1) {
          onLog('Multiple port references found, clearing extras...');

          for (let i = 1; i < matchingPorts.length; i++) {
            try {
              await matchingPorts[i].forget();
              onLog(`Forgot extra port reference ${i}`);
            } catch {
              onLog(`Failed to forget port reference ${i}`);
            }
          }
        }

        if (matchingPorts.length === 0) {
          throw new Error('Could not find selected port');
        }

        const port = matchingPorts[0];

        // Log port state before opening
        onLog(`Port state: readable=${port.readable !== null}, writable=${port.writable !== null}`);

        if (port.readable) {
          onLog(`  readable.locked=${port.readable.locked}`);
        }

        if (port.writable) {
          onLog(`  writable.locked=${port.writable.locked}`);
        }

        // Ensure port is closed before returning (esptool-js will open it)
        if (port.readable !== null || port.writable !== null) {
          onLog('Port appears to be open, closing it first...');

          try {
            if (port.readable?.locked) {
              onLog('Releasing readable stream lock...');
              const reader = port.readable.getReader();
              reader.releaseLock();
            }

            if (port.writable?.locked) {
              onLog('Releasing writable stream lock...');
              const writer = port.writable.getWriter();
              writer.releaseLock();
            }

            await port.close();
            onLog('Port closed');
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch {
            onLog('Warning: Failed to close port, continuing anyway...');
          }
        }

        return port;
      };

      onPortSelect(getPort);
    } else {
      onPortSelect(null);
    }
  };

  const handleOpen = () => {
    void (async () => {
      onLog('Scanning for ports...');
      const count = await refreshPorts();
      onLog(`Found ${count} previously granted port(s)`);

      if (count === 0) {
        onLog('No granted ports - requesting access...');
        void requestNewPort();
      }
    })();
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ flex: 1 }}>
          <Select<number | ''>
            value={selectedPortIndex}
            onChange={(e) => {
              handlePortChange(e.target.value);
            }}
            onOpen={handleOpen}
            disabled={disabled}
            displayEmpty
            sx={{ height: 42 }}
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
      </Box>

      {availablePorts !== null && availablePorts.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No ports with granted access. Click the dropdown again and select your ESP32 device from
          the browser dialog.
        </Alert>
      )}
    </>
  );
};

export default SerialPortSelector;
