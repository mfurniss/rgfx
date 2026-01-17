import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { DriverRegistry } from '@/driver-registry';
import { createDriver, type Driver } from '@/types';
import { subscribeDriverWifiResponse } from '@/mqtt-subscriptions/driver-wifi-response';
import { createMqttSubscriptionMock } from '../shared/mqtt-subscription.shared';
import { eventBus } from '@/services/event-bus';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

describe('driver-wifi-response subscription', () => {
  const { mockMqtt, triggerMessage, getSubscribedTopic } = createMqttSubscriptionMock();
  let mockDriverRegistry: ReturnType<typeof mock<DriverRegistry>>;
  let testDriver: Driver;

  beforeEach(() => {
    vi.clearAllMocks();

    testDriver = createDriver({
      id: 'test-driver',
      mac: '00:11:22:33:44:55',
      state: 'connected',
      ip: '192.168.1.100',
    });

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(testDriver);

    subscribeDriverWifiResponse({
      mqtt: mockMqtt,
      driverRegistry: mockDriverRegistry,
    });
  });

  it('should subscribe to wifi response topic', () => {
    expect(getSubscribedTopic()).toBe('rgfx/driver/+/wifi/response');
  });

  it('should handle successful wifi response', () => {
    triggerMessage(
      'rgfx/driver/test-driver/wifi/response',
      JSON.stringify({ success: true }),
    );

    expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('test-driver');
    expect(testDriver.state).toBe('disconnected');
    expect(testDriver.ip).toBeUndefined();
    expect(eventBus.emit).toHaveBeenCalledWith('driver:restarting', { driver: testDriver });
    expect(eventBus.emit).toHaveBeenCalledWith('driver:disconnected', {
      driver: testDriver,
      reason: 'restarting',
    });
  });

  it('should handle failed wifi response', () => {
    triggerMessage(
      'rgfx/driver/test-driver/wifi/response',
      JSON.stringify({ success: false, error: 'Invalid credentials' }),
    );

    // On failure, state should NOT change
    expect(testDriver.state).toBe('connected');
    expect(testDriver.ip).toBe('192.168.1.100');
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('should handle unknown driver', () => {
    mockDriverRegistry.getDriver.mockReturnValue(undefined);

    triggerMessage(
      'rgfx/driver/unknown-driver/wifi/response',
      JSON.stringify({ success: true }),
    );

    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('should handle invalid topic format', () => {
    triggerMessage('invalid/topic', JSON.stringify({ success: true }));

    expect(mockDriverRegistry.getDriver).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('should handle invalid JSON payload', () => {
    triggerMessage('rgfx/driver/test-driver/wifi/response', 'not json');

    // Should not crash, driver state unchanged
    expect(testDriver.state).toBe('connected');
    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});
