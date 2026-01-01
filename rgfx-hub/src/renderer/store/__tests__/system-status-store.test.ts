import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSystemStatusStore } from '../system-status-store';
import * as notificationStore from '../notification-store';

// Mock the notification store
vi.mock('../notification-store', () => ({
  notify: vi.fn(),
}));

// Mock the driver store
vi.mock('../driver-store', () => ({
  useDriverStore: {
    getState: () => ({
      drivers: [],
    }),
  },
}));

// Mock the events rate history store
vi.mock('../events-rate-history-store', () => ({
  useEventsRateHistoryStore: {
    getState: () => ({
      updateFromStatus: vi.fn(),
    }),
  },
}));

describe('system-status-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSystemStatusStore.setState({
      systemStatus: {
        mqttBroker: 'stopped',
        udpServer: 'inactive',
        eventReader: 'stopped',
        driversConnected: 0,
        driversTotal: 0,
        hubIp: 'Unknown',
        eventsProcessed: 0,
        eventLogSizeBytes: 0,
        hubStartTime: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
        udpStatsByDriver: {},
        systemErrors: [],
      },
    });
    vi.clearAllMocks();
  });

  describe('onSystemStatusUpdate', () => {
    it('should notify when new system error is detected', () => {
      const statusWithError = {
        mqttBroker: 'running' as const,
        udpServer: 'active' as const,
        eventReader: 'monitoring' as const,
        driversConnected: 1,
        driversTotal: 1,
        hubIp: '192.168.1.100',
        eventsProcessed: 100,
        eventLogSizeBytes: 0,
        hubStartTime: Date.now(),
        udpMessagesSent: 50,
        udpMessagesFailed: 0,
        udpStatsByDriver: {},
        systemErrors: [{ errorType: 'interceptor' as const, message: 'Test error', timestamp: Date.now() }],
      };

      useSystemStatusStore.getState().onSystemStatusUpdate(statusWithError);

      expect(notificationStore.notify).toHaveBeenCalledWith(
        'New system error detected. View details on System Status page.',
        'error',
      );
    });

    it('should not notify when system errors count stays the same', () => {
      const error = { errorType: 'interceptor' as const, message: 'Test error', timestamp: Date.now() };

      // Set initial state with one error
      useSystemStatusStore.setState({
        systemStatus: {
          ...useSystemStatusStore.getState().systemStatus,
          hubIp: '192.168.1.100',
          systemErrors: [error],
        },
      });

      vi.clearAllMocks();

      // Update with same error count
      const statusWithSameError = {
        ...useSystemStatusStore.getState().systemStatus,
        eventsProcessed: 101,
      };

      useSystemStatusStore.getState().onSystemStatusUpdate(statusWithSameError);

      expect(notificationStore.notify).not.toHaveBeenCalled();
    });

    it('should not notify when system errors count decreases', () => {
      const error = { errorType: 'interceptor' as const, message: 'Test error', timestamp: Date.now() };

      // Set initial state with one error
      useSystemStatusStore.setState({
        systemStatus: {
          ...useSystemStatusStore.getState().systemStatus,
          hubIp: '192.168.1.100',
          systemErrors: [error],
        },
      });

      vi.clearAllMocks();

      // Update with no errors
      const statusWithNoErrors = {
        ...useSystemStatusStore.getState().systemStatus,
        systemErrors: [],
      };

      useSystemStatusStore.getState().onSystemStatusUpdate(statusWithNoErrors);

      expect(notificationStore.notify).not.toHaveBeenCalled();
    });

    it('should notify on IP change when hub IP was previously known', () => {
      // Set initial state with known IP
      useSystemStatusStore.setState({
        systemStatus: {
          ...useSystemStatusStore.getState().systemStatus,
          hubIp: '192.168.1.100',
        },
      });

      vi.clearAllMocks();

      const statusWithNewIp = {
        ...useSystemStatusStore.getState().systemStatus,
        hubIp: '192.168.1.200',
      };

      useSystemStatusStore.getState().onSystemStatusUpdate(statusWithNewIp);

      expect(notificationStore.notify).toHaveBeenCalledWith('Hub IP address changed to: 192.168.1.200', 'info');
    });

    it('should not notify on initial IP discovery', () => {
      // Initial state has hubIp: 'Unknown'
      const statusWithIp = {
        ...useSystemStatusStore.getState().systemStatus,
        hubIp: '192.168.1.100',
      };

      useSystemStatusStore.getState().onSystemStatusUpdate(statusWithIp);

      expect(notificationStore.notify).not.toHaveBeenCalledWith(
        expect.stringContaining('IP address changed'),
        expect.any(String),
      );
    });
  });
});
