import { mock, type MockProxy } from 'vitest-mock-extended';
import type { MqttBroker } from '@/network';

type MqttCallback = (topic: string, payload: string) => void;

/**
 * Helper to create a mock MqttBroker that captures the subscription callback.
 *
 * @example
 * const { mockMqtt, triggerMessage, getSubscribedTopic } = createMqttSubscriptionMock();
 *
 * // Subscribe your handler
 * subscribeDriverStatus({ mqtt: mockMqtt, ... });
 *
 * // Trigger messages
 * triggerMessage('rgfx/driver/test/status', 'offline');
 *
 * // Check subscribed topic
 * expect(getSubscribedTopic()).toBe('rgfx/driver/+/status');
 */
export function createMqttSubscriptionMock(): {
  mockMqtt: MockProxy<MqttBroker>;
  triggerMessage: (topic: string, payload: string) => void;
  getSubscribedTopic: () => string | undefined;
  getCallback: () => MqttCallback | undefined;
} {
  let subscribedCallback: MqttCallback | undefined;
  let subscribedTopic: string | undefined;

  const mockMqtt = mock<MqttBroker>();
  mockMqtt.subscribe.mockImplementation((topic: string, callback: MqttCallback) => {
    subscribedTopic = topic;
    subscribedCallback = callback;
  });

  return {
    mockMqtt,
    triggerMessage: (topic: string, payload: string) => {
      if (!subscribedCallback) {
        throw new Error('No callback registered. Did you call subscribe first?');
      }
      subscribedCallback(topic, payload);
    },
    getSubscribedTopic: () => subscribedTopic,
    getCallback: () => subscribedCallback,
  };
}
