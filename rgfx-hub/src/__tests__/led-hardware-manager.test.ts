import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import * as fs from 'fs';
import { LEDHardwareManager } from '../led-hardware-manager';
import { ConfigError } from '../errors/config-error';

vi.mock('fs');

describe('LEDHardwareManager', () => {
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validHardwareJson = JSON.stringify({
    description: 'A test 8x8 matrix',
    sku: 'TEST-8X8',
    asin: 'B00TEST123',
    layout: 'matrix',
    count: 64,
    chipset: 'WS2812B',
    colorOrder: 'GRB',
    colorCorrection: 'TypicalSMD5050',
    width: 8,
    height: 8,
  });

  describe('loadHardware', () => {
    it('should load and parse valid hardware file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(validHardwareJson);

      const manager = new LEDHardwareManager('/config');
      const hardware = manager.loadHardware('led-hardware/test-matrix.json');

      expect(hardware).not.toBeNull();
      expect(hardware?.count).toBe(64);
      expect(hardware?.layout).toBe('matrix');
    });

    it('should always read from disk (no caching)', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(validHardwareJson);

      const manager = new LEDHardwareManager('/config');

      // First load
      manager.loadHardware('led-hardware/test-matrix.json');
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);

      // Second load should also read from disk
      manager.loadHardware('led-hardware/test-matrix.json');
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should return null for non-existent file', () => {
      mockFs.existsSync.mockReturnValue(false);

      const manager = new LEDHardwareManager('/config');
      const hardware = manager.loadHardware('led-hardware/missing.json');

      expect(hardware).toBeNull();
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should throw ConfigError for invalid JSON', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('not valid json');

      const manager = new LEDHardwareManager('/config');
      expect(() => manager.loadHardware('led-hardware/invalid.json')).toThrow(ConfigError);

      try {
        manager.loadHardware('led-hardware/invalid.json');
      } catch (error) {
        expect((error as ConfigError).message).toContain('Failed to parse');
        expect((error as ConfigError).filePath).toContain('invalid.json');
      }
    });

    it('should throw ConfigError for JSON that fails schema validation', () => {
      mockFs.existsSync.mockReturnValue(true);
      // Missing required 'count' field
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          sku: 'TEST',
          layout: 'strip',
        }),
      );

      const manager = new LEDHardwareManager('/config');
      expect(() => manager.loadHardware('led-hardware/invalid-schema.json')).toThrow(ConfigError);

      try {
        manager.loadHardware('led-hardware/invalid-schema.json');
      } catch (error) {
        expect((error as ConfigError).message).toContain('invalid structure');
      }
    });

    it('should propagate file read errors (not ConfigError)', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const manager = new LEDHardwareManager('/config');
      // File read errors are not caught - they propagate as-is
      expect(() => manager.loadHardware('led-hardware/no-access.json')).toThrow('Permission denied');
    });

    it('should resolve path correctly with base directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(validHardwareJson);

      const manager = new LEDHardwareManager('/custom/base');
      manager.loadHardware('led-hardware/test.json');

      expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining(path.join('/custom', 'base')));
    });
  });

  describe('hasHardware', () => {
    it('should return true when file exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      const manager = new LEDHardwareManager('/config');
      const exists = manager.hasHardware('led-hardware/test-matrix.json');

      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const manager = new LEDHardwareManager('/config');
      const exists = manager.hasHardware('led-hardware/missing.json');

      expect(exists).toBe(false);
    });
  });

  describe('listHardware', () => {
    it('should list all JSON files in led-hardware directory', () => {
      mockFs.existsSync.mockReturnValue(true);
      // readdirSync returns string[] when called without withFileTypes option
      (mockFs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        'matrix-8x8.json',
        'strip-60.json',
        'panel-16x16.json',
        'readme.txt',
      ]);

      const manager = new LEDHardwareManager('/config');
      const files = manager.listHardware();

      expect(files).toHaveLength(3);
      expect(files).toContain('led-hardware/matrix-8x8.json');
      expect(files).toContain('led-hardware/strip-60.json');
      expect(files).toContain('led-hardware/panel-16x16.json');
    });

    it('should return empty array when directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const manager = new LEDHardwareManager('/config');
      const files = manager.listHardware();

      expect(files).toHaveLength(0);
    });

    it('should return empty array on read error', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const manager = new LEDHardwareManager('/config');
      const files = manager.listHardware();

      expect(files).toHaveLength(0);
    });
  });

  describe('hardware with optional fields', () => {
    it('should load hardware without asin', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          sku: 'GEN-STRIP',
          layout: 'strip',
          count: 30,
        }),
      );

      const manager = new LEDHardwareManager('/config');
      const hardware = manager.loadHardware('led-hardware/generic.json');

      expect(hardware).not.toBeNull();
      expect(hardware?.asin).toBeUndefined();
    });

    it('should load hardware with null sku', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          sku: null,
          layout: 'strip',
          count: 50,
        }),
      );

      const manager = new LEDHardwareManager('/config');
      const hardware = manager.loadHardware('led-hardware/custom.json');

      expect(hardware).not.toBeNull();
      expect(hardware?.sku).toBeNull();
    });
  });
});
