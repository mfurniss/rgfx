import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from '../app';
import type { Driver, SystemStatus } from '@/types';

// Mock Zustand store
const mockOnDriverConnected = vi.fn();
const mockOnDriverDisconnected = vi.fn();
const mockOnSystemStatusUpdate = vi.fn();
const mockSystemStatus: SystemStatus = {
  mqttBroker: 'running',
  udpServer: 'active',
  eventReader: 'monitoring',
  driversConnected: 0,
  hubIp: '192.168.1.100',
  eventsProcessed: 0,
  hubStartTime: Date.now(),
};

vi.mock('../store/driver-store', () => ({
  useDriverStore: vi.fn((selector) => {
    const state = {
      drivers: [],
      systemStatus: mockSystemStatus,
      onDriverConnected: mockOnDriverConnected,
      onDriverDisconnected: mockOnDriverDisconnected,
      onSystemStatusUpdate: mockOnSystemStatusUpdate,
    };
    return selector(state);
  }),
}));

describe('App IPC Listener Registration', () => {
  let mockIpcOnDriverConnected: ReturnType<typeof vi.fn>;
  let mockIpcOnDriverDisconnected: ReturnType<typeof vi.fn>;
  let mockIpcOnDriverUpdated: ReturnType<typeof vi.fn>;
  let mockIpcOnSystemStatus: ReturnType<typeof vi.fn>;
  let mockRendererReady: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.rgfx IPC bridge - functions now return cleanup functions
    mockIpcOnDriverConnected = vi.fn(() => vi.fn());
    mockIpcOnDriverDisconnected = vi.fn(() => vi.fn());
    mockIpcOnDriverUpdated = vi.fn(() => vi.fn());
    mockIpcOnSystemStatus = vi.fn(() => vi.fn());
    mockRendererReady = vi.fn();

    (window as Window & { rgfx: unknown }).rgfx = {
      onDriverConnected: mockIpcOnDriverConnected,
      onDriverDisconnected: mockIpcOnDriverDisconnected,
      onDriverUpdated: mockIpcOnDriverUpdated,
      onSystemStatus: mockIpcOnSystemStatus,
      onEventCount: vi.fn(() => vi.fn()),
      onEventTopic: vi.fn(() => vi.fn()),
      onFlashOtaState: vi.fn(() => vi.fn()),
      onFlashOtaProgress: vi.fn(() => vi.fn()),
      rendererReady: mockRendererReady,
      sendDriverCommand: vi.fn(),
      updateDriverConfig: vi.fn(),
      flashOTA: vi.fn(),
      triggerDiscovery: vi.fn(),
      triggerEffect: vi.fn(),
      saveDriverConfig: vi.fn(),
      getLEDHardwareList: vi.fn(),
      openDriverLog: vi.fn(),
    };
  });

  it('should register IPC listeners exactly once on mount', () => {
    render(<App />);

    // Verify each IPC listener is registered exactly once
    expect(mockIpcOnDriverConnected).toHaveBeenCalledTimes(1);
    expect(mockIpcOnDriverDisconnected).toHaveBeenCalledTimes(1);
    expect(mockIpcOnSystemStatus).toHaveBeenCalledTimes(1);
    expect(mockRendererReady).toHaveBeenCalledTimes(1);
  });

  it('should NOT re-register IPC listeners on re-render', () => {
    const { rerender } = render(<App />);

    // Initial registration
    expect(mockIpcOnDriverConnected).toHaveBeenCalledTimes(1);

    // Force re-render
    rerender(<App />);

    // Still only registered once (not twice)
    expect(mockIpcOnDriverConnected).toHaveBeenCalledTimes(1);
    expect(mockIpcOnDriverDisconnected).toHaveBeenCalledTimes(1);
    expect(mockIpcOnSystemStatus).toHaveBeenCalledTimes(1);
  });

  it('should call Zustand action exactly once when IPC event fires', () => {
    render(<App />);

    // Get the registered callback
    const registeredCallback = mockIpcOnDriverConnected.mock.calls[0][0];

    // Simulate IPC event (use 'as Driver' since this is a test mock)
    const mockDriver = {
      id: '44:1D:64:F8:9A:58',
      connected: true,
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      ip: '192.168.1.50',
      stats: {
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
    } as Driver;
    registeredCallback(mockDriver);

    // Zustand action should be called exactly once
    expect(mockOnDriverConnected).toHaveBeenCalledTimes(1);
    expect(mockOnDriverConnected).toHaveBeenCalledWith(mockDriver);
  });
});
