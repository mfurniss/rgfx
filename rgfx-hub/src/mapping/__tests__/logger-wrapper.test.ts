/**
 * Unit tests for LoggerWrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoggerWrapper } from '../logger-wrapper';
import type ElectronLog from 'electron-log';

describe('LoggerWrapper', () => {
  let mockElectronLog: typeof ElectronLog;
  let logger: LoggerWrapper;

  beforeEach(() => {
    // Create mock electron-log instance
    mockElectronLog = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as typeof ElectronLog;

    logger = new LoggerWrapper(mockElectronLog);
  });

  describe('debug', () => {
    it('should delegate to electron-log debug method', () => {
      logger.debug('Debug message');
      expect(mockElectronLog.debug).toHaveBeenCalledWith('Debug message');
    });

    it('should forward additional arguments', () => {
      const obj = { foo: 'bar' };
      logger.debug('Debug with args', 123, obj);
      expect(mockElectronLog.debug).toHaveBeenCalledWith('Debug with args', 123, obj);
    });

    it('should handle no additional arguments', () => {
      logger.debug('Simple debug');
      expect(mockElectronLog.debug).toHaveBeenCalledWith('Simple debug');
      expect(mockElectronLog.debug).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple calls', () => {
      logger.debug('First');
      logger.debug('Second');
      expect(mockElectronLog.debug).toHaveBeenCalledTimes(2);
      expect(mockElectronLog.debug).toHaveBeenNthCalledWith(1, 'First');
      expect(mockElectronLog.debug).toHaveBeenNthCalledWith(2, 'Second');
    });
  });

  describe('info', () => {
    it('should delegate to electron-log info method', () => {
      logger.info('Info message');
      expect(mockElectronLog.info).toHaveBeenCalledWith('Info message');
    });

    it('should forward additional arguments', () => {
      const arr = [1, 2, 3];
      logger.info('Info with args', 'string', arr);
      expect(mockElectronLog.info).toHaveBeenCalledWith('Info with args', 'string', arr);
    });

    it('should handle no additional arguments', () => {
      logger.info('Simple info');
      expect(mockElectronLog.info).toHaveBeenCalledWith('Simple info');
      expect(mockElectronLog.info).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple calls', () => {
      logger.info('First info');
      logger.info('Second info');
      expect(mockElectronLog.info).toHaveBeenCalledTimes(2);
      expect(mockElectronLog.info).toHaveBeenNthCalledWith(1, 'First info');
      expect(mockElectronLog.info).toHaveBeenNthCalledWith(2, 'Second info');
    });
  });

  describe('warn', () => {
    it('should delegate to electron-log warn method', () => {
      logger.warn('Warning message');
      expect(mockElectronLog.warn).toHaveBeenCalledWith('Warning message');
    });

    it('should forward additional arguments', () => {
      const error = new Error('Test error');
      logger.warn('Warning with error', error);
      expect(mockElectronLog.warn).toHaveBeenCalledWith('Warning with error', error);
    });

    it('should handle no additional arguments', () => {
      logger.warn('Simple warning');
      expect(mockElectronLog.warn).toHaveBeenCalledWith('Simple warning');
      expect(mockElectronLog.warn).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple calls', () => {
      logger.warn('First warning');
      logger.warn('Second warning');
      expect(mockElectronLog.warn).toHaveBeenCalledTimes(2);
      expect(mockElectronLog.warn).toHaveBeenNthCalledWith(1, 'First warning');
      expect(mockElectronLog.warn).toHaveBeenNthCalledWith(2, 'Second warning');
    });
  });

  describe('error', () => {
    it('should delegate to electron-log error method', () => {
      logger.error('Error message');
      expect(mockElectronLog.error).toHaveBeenCalledWith('Error message');
    });

    it('should forward additional arguments', () => {
      const error = new Error('Critical error');
      const context = { userId: 123, action: 'save' };
      logger.error('Error with context', error, context);
      expect(mockElectronLog.error).toHaveBeenCalledWith('Error with context', error, context);
    });

    it('should handle no additional arguments', () => {
      logger.error('Simple error');
      expect(mockElectronLog.error).toHaveBeenCalledWith('Simple error');
      expect(mockElectronLog.error).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple calls', () => {
      logger.error('First error');
      logger.error('Second error');
      expect(mockElectronLog.error).toHaveBeenCalledTimes(2);
      expect(mockElectronLog.error).toHaveBeenNthCalledWith(1, 'First error');
      expect(mockElectronLog.error).toHaveBeenNthCalledWith(2, 'Second error');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(mockElectronLog.error).toHaveBeenCalledWith('Error occurred', error);
    });
  });

  describe('mixed usage', () => {
    it('should handle calls to different log levels', () => {
      logger.debug('Debug msg');
      logger.info('Info msg');
      logger.warn('Warn msg');
      logger.error('Error msg');

      expect(mockElectronLog.debug).toHaveBeenCalledWith('Debug msg');
      expect(mockElectronLog.info).toHaveBeenCalledWith('Info msg');
      expect(mockElectronLog.warn).toHaveBeenCalledWith('Warn msg');
      expect(mockElectronLog.error).toHaveBeenCalledWith('Error msg');

      expect(mockElectronLog.debug).toHaveBeenCalledTimes(1);
      expect(mockElectronLog.info).toHaveBeenCalledTimes(1);
      expect(mockElectronLog.warn).toHaveBeenCalledTimes(1);
      expect(mockElectronLog.error).toHaveBeenCalledTimes(1);
    });

    it('should not cross-contaminate between log levels', () => {
      logger.info('Info only');

      expect(mockElectronLog.info).toHaveBeenCalledWith('Info only');
      expect(mockElectronLog.debug).not.toHaveBeenCalled();
      expect(mockElectronLog.warn).not.toHaveBeenCalled();
      expect(mockElectronLog.error).not.toHaveBeenCalled();
    });
  });

  describe('special values', () => {
    it('should handle null values', () => {
      logger.info('Null value', null);
      expect(mockElectronLog.info).toHaveBeenCalledWith('Null value', null);
    });

    it('should handle undefined values', () => {
      logger.info('Undefined value', undefined);
      expect(mockElectronLog.info).toHaveBeenCalledWith('Undefined value', undefined);
    });

    it('should handle empty strings', () => {
      logger.info('');
      expect(mockElectronLog.info).toHaveBeenCalledWith('');
    });

    it('should handle complex objects', () => {
      const complex = {
        nested: {
          deeply: {
            value: 123,
          },
        },
        array: [1, 2, 3],
      };

      logger.info('Complex object', complex);
      expect(mockElectronLog.info).toHaveBeenCalledWith('Complex object', complex);
    });
  });

  describe('isolation', () => {
    it('should isolate multiple wrapper instances', () => {
      const mockLog2 = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as unknown as typeof ElectronLog;

      const logger2 = new LoggerWrapper(mockLog2);

      logger.info('Logger 1');
      logger2.info('Logger 2');

      expect(mockElectronLog.info).toHaveBeenCalledWith('Logger 1');
      expect(mockLog2.info).toHaveBeenCalledWith('Logger 2');
      expect(mockElectronLog.info).not.toHaveBeenCalledWith('Logger 2');
      expect(mockLog2.info).not.toHaveBeenCalledWith('Logger 1');
    });
  });
});
