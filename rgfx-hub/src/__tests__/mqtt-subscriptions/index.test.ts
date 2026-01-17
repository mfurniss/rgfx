import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerMqttSubscriptions } from '@/mqtt-subscriptions';

const mockSubscribeFunctions = vi.hoisted(() => ({
  subscribeDriverTelemetry: vi.fn(),
  subscribeDriverStatus: vi.fn(),
  subscribeDriverTestState: vi.fn(),
  subscribeDriverLog: vi.fn(),
  subscribeDriverWifiResponse: vi.fn(),
  subscribeDriverError: vi.fn(),
}));

vi.mock('@/mqtt-subscriptions/driver-telemetry', () => ({
  subscribeDriverTelemetry: mockSubscribeFunctions.subscribeDriverTelemetry,
}));

vi.mock('@/mqtt-subscriptions/driver-status', () => ({
  subscribeDriverStatus: mockSubscribeFunctions.subscribeDriverStatus,
}));

vi.mock('@/mqtt-subscriptions/driver-test-state', () => ({
  subscribeDriverTestState: mockSubscribeFunctions.subscribeDriverTestState,
}));

vi.mock('@/mqtt-subscriptions/driver-log', () => ({
  subscribeDriverLog: mockSubscribeFunctions.subscribeDriverLog,
}));

vi.mock('@/mqtt-subscriptions/driver-wifi-response', () => ({
  subscribeDriverWifiResponse: mockSubscribeFunctions.subscribeDriverWifiResponse,
}));

vi.mock('@/mqtt-subscriptions/driver-error', () => ({
  subscribeDriverError: mockSubscribeFunctions.subscribeDriverError,
}));

describe('registerMqttSubscriptions', () => {
  const mockDeps = {
    mqtt: {} as any,
    driverRegistry: {} as any,
    driverConfig: {} as any,
    systemMonitor: {} as any,
    driverLogPersistence: {} as any,
    getMainWindow: vi.fn(),
    getEventsProcessed: vi.fn(),
    getEventLogSizeBytes: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register all mqtt subscriptions', () => {
    registerMqttSubscriptions(mockDeps);

    expect(mockSubscribeFunctions.subscribeDriverTelemetry).toHaveBeenCalledWith(mockDeps);
    expect(mockSubscribeFunctions.subscribeDriverStatus).toHaveBeenCalledWith(mockDeps);
    expect(mockSubscribeFunctions.subscribeDriverTestState).toHaveBeenCalledWith(mockDeps);
    expect(mockSubscribeFunctions.subscribeDriverLog).toHaveBeenCalledWith(mockDeps);
    expect(mockSubscribeFunctions.subscribeDriverWifiResponse).toHaveBeenCalledWith(mockDeps);
    expect(mockSubscribeFunctions.subscribeDriverError).toHaveBeenCalledWith(mockDeps);
  });

  it('should call each subscription function exactly once', () => {
    registerMqttSubscriptions(mockDeps);

    expect(mockSubscribeFunctions.subscribeDriverTelemetry).toHaveBeenCalledTimes(1);
    expect(mockSubscribeFunctions.subscribeDriverStatus).toHaveBeenCalledTimes(1);
    expect(mockSubscribeFunctions.subscribeDriverTestState).toHaveBeenCalledTimes(1);
    expect(mockSubscribeFunctions.subscribeDriverLog).toHaveBeenCalledTimes(1);
    expect(mockSubscribeFunctions.subscribeDriverWifiResponse).toHaveBeenCalledTimes(1);
    expect(mockSubscribeFunctions.subscribeDriverError).toHaveBeenCalledTimes(1);
  });
});
