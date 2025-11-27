/**
 * MQTT client wrapper for event mappers
 *
 * Wraps the embedded Aedes MQTT broker to provide a clean interface
 * for mappers to publish messages with configurable QoS levels.
 */

import type { MqttClient } from '../types/mapping-types';
import type { MqttBroker } from '../mqtt';
import { MQTT_QOS_LEVEL } from '../config/constants';

/**
 * MQTT client wrapper implementation
 *
 * Provides async publish interface with QoS support and automatic
 * JSON serialization for the mapping system.
 */
export class MqttClientWrapper implements MqttClient {
  constructor(private mqtt: MqttBroker) {}

  /**
   * Publish message to MQTT topic
   * @param topic MQTT topic path
   * @param payload Any JSON-serializable payload
   * @param qos Quality of Service level (0, 1, or 2) - defaults to MQTT_QOS_LEVEL
   */
  async publish(
    topic: string,
    payload: unknown,
    qos: 0 | 1 | 2 = MQTT_QOS_LEVEL as 0 | 1 | 2,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload) || '';

        // Use the public aedes instance to publish with custom QoS
        this.mqtt.aedes.publish(
          {
            cmd: 'publish',
            qos: qos,
            dup: false,
            topic: topic,
            payload: Buffer.from(payloadStr),
            retain: false,
          },
          (err?: Error) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          },
        );
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}
