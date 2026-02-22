import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { flashViaUSB, type FlashCallbacks } from '../usb-flash-service';
import { sha256 } from '@/renderer/utils/binary';

// Mock esptool-js
const mockWriteFlash = vi.fn();
const mockMain = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('esptool-js', () => ({
  ESPLoader: vi.fn().mockImplementation(() => ({
    main: mockMain,
    writeFlash: mockWriteFlash,
  })),
  Transport: vi.fn().mockImplementation(() => ({
    disconnect: mockDisconnect,
  })),
}));

// Mock binary utils
vi.mock('@/renderer/utils/binary', () => ({
  arrayBufferToBinaryString: vi.fn(() => 'binary-data'),
  sha256: vi.fn(() => Promise.resolve('a'.repeat(64))),
}));

// Mock window.rgfx
const mockGetFirmwareManifest = vi.fn();
const mockGetFirmwareFile = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Reset sha256 mock to correct checksum for each test
  (sha256 as Mock).mockResolvedValue('a'.repeat(64));

  // Setup window.rgfx mock - add to existing window object
  (window as any).rgfx = {
    getFirmwareManifest: mockGetFirmwareManifest,
    getFirmwareFile: mockGetFirmwareFile,
  };

  // Default mock implementations with multi-chip variant structure
  mockGetFirmwareManifest.mockResolvedValue({
    generatedAt: '2025-01-01T00:00:00Z',
    variants: {
      ESP32: {
        version: '1.0.0',
        files: [
          {
            name: 'firmware-esp32.bin',
            address: 0x10000,
            size: 100,
            sha256: 'a'.repeat(64),
          },
        ],
      },
      'ESP32-S3': {
        version: '1.0.0',
        files: [
          {
            name: 'firmware-esp32s3.bin',
            address: 0x10000,
            size: 100,
            sha256: 'a'.repeat(64),
          },
        ],
      },
    },
  });

  mockGetFirmwareFile.mockResolvedValue(new Uint8Array(100));
  mockMain.mockResolvedValue('ESP32');
  mockWriteFlash.mockResolvedValue(undefined);
  mockDisconnect.mockResolvedValue(undefined);
});

describe('flashViaUSB', () => {
  const createMockCallbacks = (): FlashCallbacks & {
    logs: string[];
    progressValues: number[];
  } => {
    const logs: string[] = [];
    const progressValues: number[] = [];
    return {
      logs,
      progressValues,
      onLog: (message: string) => logs.push(message),
      onProgress: (percent: number) => progressValues.push(percent),
    };
  };

  const createMockPort = () => ({
    setSignals: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    readable: true,
    writable: true,
  });

  describe('successful flash', () => {
    it('should return success with firmware version and chip type', async () => {
      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(true);
      expect(result.firmwareVersion).toBe('1.0.0');
      expect(result.chipType).toBe('ESP32');
      expect(result.error).toBeUndefined();
    });

    it('should detect and flash ESP32-S3', async () => {
      mockMain.mockResolvedValue('ESP32-S3');

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(true);
      expect(result.chipType).toBe('ESP32-S3');
    });

    it('should call progress callback with 0 at start', async () => {
      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      expect(callbacks.progressValues[0]).toBe(0);
    });

    it('should log firmware version', async () => {
      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      expect(callbacks.logs.some((log) => log.includes('1.0.0'))).toBe(true);
    });

    it('should reset device after flash', async () => {
      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      // Should set RTS true then false for reset
      expect(mockPort.setSignals).toHaveBeenCalledWith({ requestToSend: true });
      expect(mockPort.setSignals).toHaveBeenCalledWith({ requestToSend: false });
    });

    it('should close port after flash', async () => {
      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      expect(mockPort.close).toHaveBeenCalled();
    });
  });

  describe('firmware manifest validation', () => {
    it('should fail with invalid manifest', async () => {
      mockGetFirmwareManifest.mockResolvedValue({ invalid: 'manifest' });

      const callbacks = createMockCallbacks();
      const getPort = vi.fn();

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid firmware manifest');
    });

    it('should fail for unsupported chip type', async () => {
      mockMain.mockResolvedValue('ESP32-C3'); // Not supported

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported chip type');
    });
  });

  describe('firmware file verification', () => {
    it('should fail on size mismatch', async () => {
      // Return a buffer with wrong size
      mockGetFirmwareFile.mockResolvedValue(new Uint8Array(50)); // Expected 100

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Size mismatch');
    });

    it('should fail on checksum mismatch', async () => {
      (sha256 as Mock).mockResolvedValue('b'.repeat(64)); // Wrong checksum

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Checksum mismatch');
    });
  });

  describe('error handling', () => {
    it('should handle ESPLoader connection failure', async () => {
      mockMain.mockRejectedValue(new Error('Connection failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should handle flash write failure', async () => {
      mockWriteFlash.mockRejectedValue(new Error('Flash write failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Flash write failed');
    });

    it('should log error message on failure', async () => {
      mockWriteFlash.mockRejectedValue(new Error('Flash write failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      expect(callbacks.logs.some((log) => log.includes('Flash write failed'))).toBe(true);
    });

    it('should still cleanup on error', async () => {
      mockWriteFlash.mockRejectedValue(new Error('Flash write failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockPort.close).toHaveBeenCalled();
    });
  });

  describe('cleanup behavior', () => {
    it('should not try to close already closed port', async () => {
      const callbacks = createMockCallbacks();
      const mockPort = {
        setSignals: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        readable: false,
        writable: false,
      };
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      expect(mockPort.close).not.toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      mockDisconnect.mockRejectedValue(new Error('Disconnect failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      // Should not throw
      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(true);
    });
  });
});
