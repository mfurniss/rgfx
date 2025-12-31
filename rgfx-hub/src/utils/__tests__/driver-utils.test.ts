/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import type { BrowserWindow, WebContents } from 'electron';
import type { DriverRegistry } from '@/driver-registry';
import { createMockDriver } from '@/__tests__/factories';
import { createDriver } from '@/types';
import {
  requireDriverWithMac,
  requireDriver,
  sendToRenderer,
  getErrorMessage,
  buildDriverTopic,
} from '../driver-utils';

describe('driver-utils', () => {
  describe('requireDriverWithMac', () => {
    let mockDriverRegistry: MockProxy<DriverRegistry>;

    beforeEach(() => {
      mockDriverRegistry = mock<DriverRegistry>();
    });

    it('should return driver when found with MAC', () => {
      const driver = createMockDriver({ mac: 'AA:BB:CC:DD:EE:FF' });
      mockDriverRegistry.getDriver.mockReturnValue(driver);

      const result = requireDriverWithMac('test-driver', mockDriverRegistry);

      expect(result).toBe(driver);
      expect(result.mac).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('should throw when driver not found', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      expect(() => requireDriverWithMac('unknown', mockDriverRegistry)).toThrow(
        'No driver found with ID unknown',
      );
    });

    it('should throw when driver has no MAC', () => {
      // Use createDriver directly since factory uses merge which ignores undefined
      const driver = createDriver({ id: 'test-driver', mac: undefined });
      mockDriverRegistry.getDriver.mockReturnValue(driver);

      expect(() => requireDriverWithMac('test-driver', mockDriverRegistry)).toThrow(
        'Driver test-driver has no MAC address',
      );
    });

    it('should include driver ID in error messages', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      expect(() => requireDriverWithMac('my-specific-driver', mockDriverRegistry)).toThrow(
        'No driver found with ID my-specific-driver',
      );
    });
  });

  describe('requireDriver', () => {
    let mockDriverRegistry: MockProxy<DriverRegistry>;

    beforeEach(() => {
      mockDriverRegistry = mock<DriverRegistry>();
    });

    it('should return driver when found', () => {
      const driver = createMockDriver();
      mockDriverRegistry.getDriver.mockReturnValue(driver);

      const result = requireDriver('test-driver', mockDriverRegistry);

      expect(result).toBe(driver);
    });

    it('should return driver without MAC (does not require MAC)', () => {
      const driver = createMockDriver();
      mockDriverRegistry.getDriver.mockReturnValue(driver);

      // requireDriver doesn't validate MAC, unlike requireDriverWithMac
      const result = requireDriver('test-driver', mockDriverRegistry);

      expect(result).toBe(driver);
    });

    it('should throw when driver not found', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      expect(() => requireDriver('unknown', mockDriverRegistry)).toThrow(
        'No driver found with ID unknown',
      );
    });
  });

  describe('sendToRenderer', () => {
    it('should send message when window exists and is not destroyed', () => {
      const mockSend = vi.fn();
      const mockWindow = {
        isDestroyed: () => false,
        webContents: { send: mockSend } as unknown as WebContents,
      } as BrowserWindow;

      sendToRenderer(() => mockWindow, 'test-channel', 'arg1', 'arg2');

      expect(mockSend).toHaveBeenCalledWith('test-channel', 'arg1', 'arg2');
    });

    it('should not send when window is null', () => {
      const mockSend = vi.fn();

      sendToRenderer(() => null, 'test-channel', 'data');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should not send when window is destroyed', () => {
      const mockSend = vi.fn();
      const mockWindow = {
        isDestroyed: () => true,
        webContents: { send: mockSend } as unknown as WebContents,
      } as BrowserWindow;

      sendToRenderer(() => mockWindow, 'test-channel', 'data');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should pass multiple arguments', () => {
      const mockSend = vi.fn();
      const mockWindow = {
        isDestroyed: () => false,
        webContents: { send: mockSend } as unknown as WebContents,
      } as BrowserWindow;

      sendToRenderer(() => mockWindow, 'driver:updated', { id: '1' }, { extra: true });

      expect(mockSend).toHaveBeenCalledWith('driver:updated', { id: '1' }, { extra: true });
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Something went wrong');

      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('should stringify non-Error values', () => {
      expect(getErrorMessage('string error')).toBe('string error');
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle Error subclasses', () => {
      const error = new TypeError('Type mismatch');

      expect(getErrorMessage(error)).toBe('Type mismatch');
    });

    it('should stringify objects', () => {
      const obj = { code: 'ERR_TIMEOUT' };

      expect(getErrorMessage(obj)).toBe('[object Object]');
    });
  });

  describe('buildDriverTopic', () => {
    it('should build topic with MAC and command', () => {
      expect(buildDriverTopic('AA:BB:CC:DD:EE:FF', 'restart')).toBe(
        'rgfx/driver/AA:BB:CC:DD:EE:FF/restart',
      );
    });

    it('should handle various commands', () => {
      expect(buildDriverTopic('00:11:22:33:44:55', 'set-id')).toBe(
        'rgfx/driver/00:11:22:33:44:55/set-id',
      );
      expect(buildDriverTopic('00:11:22:33:44:55', 'clear-effects')).toBe(
        'rgfx/driver/00:11:22:33:44:55/clear-effects',
      );
      expect(buildDriverTopic('00:11:22:33:44:55', 'config')).toBe(
        'rgfx/driver/00:11:22:33:44:55/config',
      );
    });
  });
});
