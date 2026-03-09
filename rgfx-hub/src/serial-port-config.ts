import { session } from 'electron';
import log from 'electron-log/main';

const DEVICE_WAIT_TIMEOUT_MS = 3000;

function isEsp32Port(port: Electron.SerialPort): boolean {
  const vid = port.vendorId;
  const pid = port.productId;
  return (
    (vid === '10c4' && pid === 'ea60') || // CP2102
    (vid === '1a86' && pid === '7523') || // CH340
    (vid === '0403' && pid === '6001') || // FTDI
    vid === '303a' // Espressif native USB
  );
}

function logPort(port: Electron.SerialPort, prefix = ''): void {
  log.info(`[serial] ${prefix}${port.displayName ?? port.portName} (VID=${port.vendorId} PID=${port.productId})`);
}

function selectBestPort(ports: Electron.SerialPort[], callback: (portId: string) => void): void {
  if (ports.length === 0) {
    log.warn('[serial] No serial ports available');
    callback('');
    return;
  }

  const esp32Port = ports.find(isEsp32Port);
  const selected = esp32Port ?? ports[0];

  log.info(`[serial] Selected: ${selected.displayName ?? selected.portName}`);
  callback(selected.portId);
}

export function configureSerialPort(): void {
  session.defaultSession.on('select-serial-port', (event, portList, _webContents, callback) => {
    event.preventDefault();

    log.info(`[serial] Port request (platform=${process.platform}), ${portList.length} port(s) available`);
    portList.forEach((p) => {
      logPort(p, '  ');
    });

    if (portList.length > 0) {
      selectBestPort(portList, callback);
      return;
    }

    // No ports yet — wait for late-arriving devices (ESP32-S3 native USB can be slow on Windows)
    log.info('[serial] No ports yet, waiting for device...');
    const discoveredPorts: Electron.SerialPort[] = [];

    const onAdded = (_event: Electron.Event, port: Electron.SerialPort) => {
      logPort(port, 'Port added: ');
      discoveredPorts.push(port);
    };

    session.defaultSession.on('serial-port-added', onAdded);

    setTimeout(() => {
      session.defaultSession.removeListener('serial-port-added', onAdded);
      selectBestPort(discoveredPorts, callback);
    }, DEVICE_WAIT_TIMEOUT_MS);
  });

  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setDevicePermissionHandler(() => true);
}
