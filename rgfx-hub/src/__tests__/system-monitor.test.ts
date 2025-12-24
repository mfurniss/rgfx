/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available before vi.mock factories run
const { mockFirmwareWatcher, mockGetCurrentVersion, mockGetLocalIP } = vi.hoisted(() => ({
  mockFirmwareWatcher: {
    on: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  mockGetCurrentVersion: vi.fn(),
  mockGetLocalIP: vi.fn(),
}));

vi.mock('../services/firmware-watcher', () => ({
  FirmwareWatcher: vi.fn(() => mockFirmwareWatcher),
}));

vi.mock('../services/firmware-version-service', () => ({
  firmwareVersionService: {
    getCurrentVersion: mockGetCurrentVersion,
  },
}));

vi.mock('../network/network-utils', () => ({
  getLocalIP: mockGetLocalIP,
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { SystemMonitor } from '../system-monitor';

describe('SystemMonitor', () => {
  let systemMonitor: SystemMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLocalIP.mockReturnValue('192.168.1.100');
    mockGetCurrentVersion.mockReturnValue('1.0.0');
    systemMonitor = new SystemMonitor();
  });

  describe('constructor', () => {
    it('should set up firmware watcher on construction', () => {
      expect(mockFirmwareWatcher.on).toHaveBeenCalledWith(
        'firmware-updated',
        expect.any(Function),
      );
    });
  });

  describe('getLocalIpAddress', () => {
    it('should return IP address when network is available', () => {
      mockGetLocalIP.mockReturnValue('192.168.1.100');

      const ip = systemMonitor.getLocalIpAddress();

      expect(ip).toBe('192.168.1.100');
    });

    it('should return "Unknown" when getLocalIP returns localhost', () => {
      mockGetLocalIP.mockReturnValue('127.0.0.1');

      const ip = systemMonitor.getLocalIpAddress();

      expect(ip).toBe('Unknown');
    });
  });

  describe('getSystemStatus', () => {
    it('should return complete system status when network is available', () => {
      mockGetLocalIP.mockReturnValue('192.168.1.100');
      mockGetCurrentVersion.mockReturnValue('2.0.0');

      const status = systemMonitor.getSystemStatus(5, 10, 1000, { 'pacman/score': 42 });

      expect(status).toEqual({
        mqttBroker: 'running',
        udpServer: 'active',
        eventReader: 'monitoring',
        driversConnected: 5,
        driversTotal: 10,
        hubIp: '192.168.1.100',
        eventsProcessed: 1000,
        hubStartTime: expect.any(Number),
        currentFirmwareVersion: '2.0.0',
        eventTopics: { 'pacman/score': 42 },
      });
    });

    it('should show stopped/inactive services when network is unavailable', () => {
      mockGetLocalIP.mockReturnValue('127.0.0.1');

      const status = systemMonitor.getSystemStatus(0, 0, 0, {});

      expect(status).toEqual({
        mqttBroker: 'stopped',
        udpServer: 'inactive',
        eventReader: 'monitoring',
        driversConnected: 0,
        driversTotal: 0,
        hubIp: 'Unknown',
        eventsProcessed: 0,
        hubStartTime: expect.any(Number),
        currentFirmwareVersion: '1.0.0', // From beforeEach default
        eventTopics: {},
      });
    });

    it('should omit firmwareVersion when getCurrentVersion returns null', () => {
      mockGetCurrentVersion.mockReturnValue(null);

      const status = systemMonitor.getSystemStatus(1, 2, 50, {});

      expect(status.currentFirmwareVersion).toBeUndefined();
    });

    it('should preserve hubStartTime across calls', () => {
      const status1 = systemMonitor.getSystemStatus(1, 2, 100, {});
      const status2 = systemMonitor.getSystemStatus(2, 3, 200, {});

      expect(status1.hubStartTime).toBe(status2.hubStartTime);
    });
  });

  describe('startFirmwareMonitoring', () => {
    it('should start firmware watcher with callback', () => {
      const callback = vi.fn();

      systemMonitor.startFirmwareMonitoring(callback);

      expect(mockFirmwareWatcher.start).toHaveBeenCalled();
    });

    it('should call callback when firmware is updated', () => {
      const callback = vi.fn();
      systemMonitor.startFirmwareMonitoring(callback);

      // Get the callback that was registered with the watcher
      const firmwareUpdatedCallback = mockFirmwareWatcher.on.mock.calls.find(
        (call) => call[0] === 'firmware-updated',
      )?.[1] as (version: string | null) => void;

      // Simulate firmware update
      firmwareUpdatedCallback('3.0.0');

      expect(callback).toHaveBeenCalledWith('3.0.0');
    });

    it('should handle null firmware version', () => {
      const callback = vi.fn();
      systemMonitor.startFirmwareMonitoring(callback);

      const firmwareUpdatedCallback = mockFirmwareWatcher.on.mock.calls.find(
        (call) => call[0] === 'firmware-updated',
      )?.[1] as (version: string | null) => void;

      firmwareUpdatedCallback(null);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('stopFirmwareMonitoring', () => {
    it('should stop firmware watcher', () => {
      systemMonitor.stopFirmwareMonitoring();

      expect(mockFirmwareWatcher.stop).toHaveBeenCalled();
    });
  });
});
