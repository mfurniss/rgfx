/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available before vi.mock factories run
const { mockFirmwareWatcher, mockGetVersions, mockGetLocalIP, mockMqttBroker } = vi.hoisted(() => ({
  mockFirmwareWatcher: {
    on: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  mockGetVersions: vi.fn(),
  mockGetLocalIP: vi.fn(),
  mockMqttBroker: {
    isRunning: true,
    isDiscoveryActive: true,
  },
}));

vi.mock('../services/firmware-watcher', () => ({
  FirmwareWatcher: vi.fn(() => mockFirmwareWatcher),
}));

vi.mock('../services/firmware-version-service', () => ({
  firmwareVersionService: {
    getVersions: mockGetVersions,
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
import type { MqttBroker } from '../network/mqtt-broker';

describe('SystemMonitor', () => {
  let systemMonitor: SystemMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLocalIP.mockReturnValue('192.168.1.100');
    mockGetVersions.mockReturnValue({ 'ESP32': '1.0.0', 'ESP32-S3': '1.0.0' });
    mockMqttBroker.isRunning = true;
    mockMqttBroker.isDiscoveryActive = true;
    systemMonitor = new SystemMonitor(mockMqttBroker as unknown as MqttBroker);
  });

  describe('constructor', () => {
    it('should set up firmware watcher on construction', () => {
      expect(mockFirmwareWatcher.on).toHaveBeenCalledWith(
        'firmware-updated',
        expect.any(Function),
      );
    });
  });

  describe('getSystemStatus', () => {
    it('should return complete system status when network is available', () => {
      mockGetLocalIP.mockReturnValue('192.168.1.100');
      mockGetVersions.mockReturnValue({ 'ESP32': '2.0.0', 'ESP32-S3': '2.0.1' });

      const status = systemMonitor.getSystemStatus(5, 10, 1000, 2048);

      expect(status).toEqual({
        mqttBroker: 'running',
        discovery: 'active',
        eventReader: 'monitoring',
        driversConnected: 5,
        driversTotal: 10,
        hubIp: '192.168.1.100',
        eventsProcessed: 1000,
        eventLogSizeBytes: 2048,
        hubStartTime: expect.any(Number),
        firmwareVersions: { 'ESP32': '2.0.0', 'ESP32-S3': '2.0.1' },
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
        udpStatsByDriver: {},
        systemErrors: [],
      });
    });

    it('should show stopped/inactive services when broker is not running', () => {
      mockMqttBroker.isRunning = false;
      mockMqttBroker.isDiscoveryActive = false;

      const status = systemMonitor.getSystemStatus(0, 0, 0, 0);

      expect(status).toEqual({
        mqttBroker: 'stopped',
        discovery: 'inactive',
        eventReader: 'monitoring',
        driversConnected: 0,
        driversTotal: 0,
        hubIp: '192.168.1.100',
        eventsProcessed: 0,
        eventLogSizeBytes: 0,
        hubStartTime: expect.any(Number),
        firmwareVersions: { 'ESP32': '1.0.0', 'ESP32-S3': '1.0.0' },
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
        udpStatsByDriver: {},
        systemErrors: [],
      });
    });

    it('should return empty firmwareVersions when getVersions returns empty', () => {
      mockGetVersions.mockReturnValue({});

      const status = systemMonitor.getSystemStatus(1, 2, 50, 0);

      expect(status.firmwareVersions).toEqual({});
    });

    it('should preserve hubStartTime across calls', () => {
      const status1 = systemMonitor.getSystemStatus(1, 2, 100, 0);
      const status2 = systemMonitor.getSystemStatus(2, 3, 200, 0);

      expect(status1.hubStartTime).toBe(status2.hubStartTime);
    });

    it('should include system errors when provided', () => {
      const errors = [
        { errorType: 'interceptor' as const, message: 'Test error 1', timestamp: 1000 },
        { errorType: 'interceptor' as const, message: 'Test error 2', timestamp: 2000 },
      ];

      const status = systemMonitor.getSystemStatus(1, 2, 100, 0, errors);

      expect(status.systemErrors).toEqual(errors);
      expect(status.systemErrors).toHaveLength(2);
    });

    it('should default to empty array when no errors provided', () => {
      const status = systemMonitor.getSystemStatus(1, 2, 100, 0);

      expect(status.systemErrors).toEqual([]);
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

  describe('trackUdpSent', () => {
    it('should increment sent count on success', () => {
      systemMonitor.trackUdpSent('driver-1', true);
      systemMonitor.trackUdpSent('driver-1', true);
      systemMonitor.trackUdpSent('driver-1', true);

      const status = systemMonitor.getSystemStatus(0, 0, 0, 0);

      expect(status.udpMessagesSent).toBe(3);
      expect(status.udpMessagesFailed).toBe(0);
    });

    it('should increment failed count on failure', () => {
      systemMonitor.trackUdpSent('driver-1', false);
      systemMonitor.trackUdpSent('driver-1', false);

      const status = systemMonitor.getSystemStatus(0, 0, 0, 0);

      expect(status.udpMessagesSent).toBe(0);
      expect(status.udpMessagesFailed).toBe(2);
    });

    it('should track stats per driver', () => {
      systemMonitor.trackUdpSent('driver-1', true);
      systemMonitor.trackUdpSent('driver-1', true);
      systemMonitor.trackUdpSent('driver-2', true);
      systemMonitor.trackUdpSent('driver-2', false);

      const stats1 = systemMonitor.getUdpStatsForDriver('driver-1');
      const stats2 = systemMonitor.getUdpStatsForDriver('driver-2');

      expect(stats1).toEqual({ sent: 2, failed: 0 });
      expect(stats2).toEqual({ sent: 1, failed: 1 });
    });

    it('should aggregate totals across all drivers in system status', () => {
      systemMonitor.trackUdpSent('driver-1', true);
      systemMonitor.trackUdpSent('driver-1', false);
      systemMonitor.trackUdpSent('driver-2', true);
      systemMonitor.trackUdpSent('driver-2', true);
      systemMonitor.trackUdpSent('driver-3', false);

      const status = systemMonitor.getSystemStatus(0, 0, 0, 0);

      expect(status.udpMessagesSent).toBe(3);
      expect(status.udpMessagesFailed).toBe(2);
    });

    it('should return empty stats for unknown driver', () => {
      const stats = systemMonitor.getUdpStatsForDriver('unknown-driver');

      expect(stats).toEqual({ sent: 0, failed: 0 });
    });

    it('should include per-driver stats in system status', () => {
      systemMonitor.trackUdpSent('driver-1', true);
      systemMonitor.trackUdpSent('driver-1', true);
      systemMonitor.trackUdpSent('driver-2', true);
      systemMonitor.trackUdpSent('driver-2', false);

      const status = systemMonitor.getSystemStatus(0, 0, 0, 0);

      expect(status.udpStatsByDriver).toEqual({
        'driver-1': { sent: 2, failed: 0 },
        'driver-2': { sent: 1, failed: 1 },
      });
    });
  });
});
