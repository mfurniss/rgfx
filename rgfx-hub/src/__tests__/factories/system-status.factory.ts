import type { SystemStatus } from '@/types';

const defaultSystemStatus: SystemStatus = {
  mqttBroker: 'running',
  discovery: 'active',
  eventReader: 'monitoring',
  driversConnected: 0,
  driversTotal: 0,
  hubIp: '192.168.1.1',
  eventsProcessed: 0,
  eventLogSizeBytes: 0,
  hubStartTime: Date.now(),
  udpMessagesSent: 0,
  udpMessagesFailed: 0,
  udpStatsByDriver: {},
  systemErrors: [],
  ffmpegAvailable: false,
};

/**
 * Factory function to create mock SystemStatus objects for testing.
 * Only specify the fields you want to override.
 *
 * @example
 * const status = createMockSystemStatus()
 * const withErrors = createMockSystemStatus({
 *   systemErrors: [{ errorType: 'driver', message: 'fail', timestamp: Date.now() }],
 * })
 */
export function createMockSystemStatus(
  overrides?: Partial<SystemStatus>,
): SystemStatus {
  return { ...defaultSystemStatus, ...overrides };
}
