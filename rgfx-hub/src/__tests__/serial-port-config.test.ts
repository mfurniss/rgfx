import { describe, it, expect, vi, beforeEach } from 'vitest';

type SelectSerialPortHandler = (
  event: { preventDefault: () => void },
  portList: Electron.SerialPort[],
  webContents: unknown,
  callback: (portId: string) => void,
) => void;

type SerialPortAddedHandler = (event: Electron.Event, port: Electron.SerialPort) => void;

let selectSerialPortHandler: SelectSerialPortHandler;
let serialPortAddedHandlers: SerialPortAddedHandler[] = [];

const {
  mockSessionOn,
  mockSessionRemoveListener,
  mockSetPermissionCheckHandler,
  mockSetDevicePermissionHandler,
} = vi.hoisted(() => ({
  mockSessionOn: vi.fn(),
  mockSessionRemoveListener: vi.fn(),
  mockSetPermissionCheckHandler: vi.fn(),
  mockSetDevicePermissionHandler: vi.fn(),
}));

vi.mock('electron', () => ({
  session: {
    defaultSession: {
      on: mockSessionOn,
      removeListener: mockSessionRemoveListener,
      setPermissionCheckHandler: mockSetPermissionCheckHandler,
      setDevicePermissionHandler: mockSetDevicePermissionHandler,
    },
  },
}));

import { configureSerialPort } from '../serial-port-config';

function makePort(
  portId: string,
  vendorId: string,
  productId: string,
  portName = 'COM1',
): Electron.SerialPort {
  return {
    portId,
    vendorId,
    productId,
    portName,
    displayName: portName,
  } as Electron.SerialPort;
}

describe('configureSerialPort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    serialPortAddedHandlers = [];

    // Capture handlers registered via session.on
    mockSessionOn.mockImplementation((event: string, handler: unknown) => {
      if (event === 'select-serial-port') {
        selectSerialPortHandler = handler as SelectSerialPortHandler;
      }

      if (event === 'serial-port-added') {
        serialPortAddedHandlers.push(handler as SerialPortAddedHandler);
      }
    });
  });

  it('should register select-serial-port handler and permission handlers', () => {
    configureSerialPort();

    expect(mockSessionOn).toHaveBeenCalledWith('select-serial-port', expect.any(Function));
    expect(mockSetPermissionCheckHandler).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSetDevicePermissionHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should grant all permissions', () => {
    configureSerialPort();

    const permissionCheck = mockSetPermissionCheckHandler.mock.calls[0][0];
    const devicePermission = mockSetDevicePermissionHandler.mock.calls[0][0];

    expect(permissionCheck()).toBe(true);
    expect(devicePermission()).toBe(true);
  });

  describe('port selection', () => {
    beforeEach(() => {
      configureSerialPort();
    });

    it('should preventDefault on the event', () => {
      const event = { preventDefault: vi.fn() };
      const callback = vi.fn();
      const ports = [makePort('port1', '1234', '5678')];

      selectSerialPortHandler(event, ports, null, callback);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should select ESP32 CP2102 port by VID/PID', () => {
      const event = { preventDefault: vi.fn() };
      const callback = vi.fn();
      const ports = [
        makePort('generic', '1111', '2222'),
        makePort('cp2102', '10c4', 'ea60'),
      ];

      selectSerialPortHandler(event, ports, null, callback);

      expect(callback).toHaveBeenCalledWith('cp2102');
    });

    it('should select ESP32 CH340 port by VID/PID', () => {
      const event = { preventDefault: vi.fn() };
      const callback = vi.fn();
      const ports = [makePort('ch340', '1a86', '7523')];

      selectSerialPortHandler(event, ports, null, callback);

      expect(callback).toHaveBeenCalledWith('ch340');
    });

    it('should select ESP32 FTDI port by VID/PID', () => {
      const event = { preventDefault: vi.fn() };
      const callback = vi.fn();
      const ports = [makePort('ftdi', '0403', '6001')];

      selectSerialPortHandler(event, ports, null, callback);

      expect(callback).toHaveBeenCalledWith('ftdi');
    });

    it('should select Espressif native USB port by VID', () => {
      const event = { preventDefault: vi.fn() };
      const callback = vi.fn();
      const ports = [makePort('espressif', '303a', '1001')];

      selectSerialPortHandler(event, ports, null, callback);

      expect(callback).toHaveBeenCalledWith('espressif');
    });

    it('should fall back to first port when no ESP32 port found', () => {
      const event = { preventDefault: vi.fn() };
      const callback = vi.fn();
      const ports = [
        makePort('generic1', '1111', '2222'),
        makePort('generic2', '3333', '4444'),
      ];

      selectSerialPortHandler(event, ports, null, callback);

      expect(callback).toHaveBeenCalledWith('generic1');
    });

    it('should callback with empty string when no ports available and none arrive', () => {
      const event = { preventDefault: vi.fn() };
      const callback = vi.fn();

      selectSerialPortHandler(event, [], null, callback);

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);

      expect(callback).toHaveBeenCalledWith('');
    });

    it('should wait for late-arriving devices when no ports initially', () => {
      const event = { preventDefault: vi.fn() };
      const callback = vi.fn();

      selectSerialPortHandler(event, [], null, callback);

      const latePort = makePort('late-esp32', '303a', '1001');

      for (const handler of serialPortAddedHandlers) {
        handler({} as Electron.Event, latePort);
      }

      vi.advanceTimersByTime(3000);

      expect(callback).toHaveBeenCalledWith('late-esp32');
      expect(mockSessionRemoveListener).toHaveBeenCalledWith('serial-port-added', expect.any(Function));
    });
  });
});
