import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { flashViaUSB, type FlashCallbacks } from '../usb-flash-service';
import { sha256 } from '@/renderer/utils/binary';

// Mock esp-loader-factory
const mockInitialize = vi.fn();
const mockRunStub = vi.fn();
const mockDisconnect = vi.fn();
const mockHardResetToFirmware = vi.fn();
const mockFlashData = vi.fn();

let mockChipName = 'ESP32';

vi.mock('../esp-loader-factory', () => ({
  createEspLoader: vi.fn().mockImplementation(() =>
    Promise.resolve({
      initialize: mockInitialize,
      get chipName() {
        return mockChipName;
      },
      runStub: mockRunStub,
      disconnect: mockDisconnect,
      hardResetToFirmware: mockHardResetToFirmware,
    }),
  ),
}));

// Mock binary utils
vi.mock('@/renderer/utils/binary', () => ({
  sha256: vi.fn(() => Promise.resolve('a'.repeat(64))),
}));

// Mock window.rgfx
const mockGetFirmwareManifest = vi.fn();
const mockGetFirmwareFile = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockChipName = 'ESP32';

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
  mockInitialize.mockResolvedValue(undefined);
  mockRunStub.mockResolvedValue({
    flashData: mockFlashData,
  });
  mockFlashData.mockResolvedValue(undefined);
  mockDisconnect.mockResolvedValue(undefined);
  mockHardResetToFirmware.mockResolvedValue(undefined);
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
    getInfo: vi.fn().mockReturnValue({}),
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
      mockChipName = 'ESP32-S3';

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

      expect(mockHardResetToFirmware).toHaveBeenCalled();
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
      mockChipName = 'ESP32-C3';

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
      mockInitialize.mockRejectedValue(new Error('Connection failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should handle flash write failure', async () => {
      mockFlashData.mockRejectedValue(new Error('Flash write failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      const result = await flashViaUSB(getPort, callbacks);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Flash write failed');
    });

    it('should log error message on failure', async () => {
      mockFlashData.mockRejectedValue(new Error('Flash write failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      expect(callbacks.logs.some((log) => log.includes('Flash write failed'))).toBe(true);
    });

    it('should still cleanup on error', async () => {
      mockFlashData.mockRejectedValue(new Error('Flash write failed'));

      const callbacks = createMockCallbacks();
      const mockPort = createMockPort();
      const getPort = vi.fn().mockResolvedValue(mockPort);

      await flashViaUSB(getPort, callbacks);

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('cleanup behavior', () => {
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
