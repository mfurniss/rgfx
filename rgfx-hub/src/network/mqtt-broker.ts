/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import Aedes from 'aedes';
import { createServer, Server } from 'node:net';
import log from 'electron-log/main';
import { MQTT_DEFAULT_PORT, MQTT_QOS_LEVEL } from '../config/constants';
import { getLocalIP } from './network-utils';
import type { DiscoveryService } from './discovery-service';
import { SsdpDiscovery } from './ssdp-discovery';
import { UdpDiscovery } from './udp-discovery';

/**
 * MQTT broker using Aedes with integrated discovery services.
 * Manages the MQTT broker lifecycle and coordinates discovery services
 * that advertise the broker to ESP32 drivers.
 */
export class MqttBroker {
  public aedes: Aedes; // Public for MqttClientWrapper access
  private server: Server;
  private port: number;
  private subscriptions = new Map<string, (topic: string, payload: string) => void>();
  private discoveryServices: DiscoveryService[];

  constructor(port = MQTT_DEFAULT_PORT, discoveryServices?: DiscoveryService[]) {
    this.port = port;
    this.aedes = new Aedes();
    this.server = createServer(this.aedes.handle);
    this.setupEventHandlers();

    // Use provided discovery services or create defaults
    this.discoveryServices = discoveryServices ?? [new SsdpDiscovery(), new UdpDiscovery()];
  }

  /**
   * Stop discovery services without restarting.
   * Called by NetworkManager when network becomes unreachable.
   */
  stopDiscovery(): void {
    log.info('Stopping discovery services');

    for (const service of this.discoveryServices) {
      service.stop();
    }
  }

  /**
   * Restart discovery services with a new IP address.
   * Called by NetworkManager when network recovers.
   */
  restartDiscovery(newIP: string): void {
    log.info(`Starting discovery services with IP: ${newIP}`);

    for (const service of this.discoveryServices) {
      service.start({ mqttPort: this.port, localIP: newIP });
    }
  }

  private setupEventHandlers() {
    this.server.on('error', (err) => {
      log.error('MQTT server error:', err);
    });

    this.aedes.on('client', (client) => {
      log.info(`MQTT client connected: ${client.id}`);
    });

    this.aedes.on('clientDisconnect', (client) => {
      log.info(`MQTT client disconnected: ${client.id}`);
    });

    this.aedes.on('publish', (packet, client) => {
      if (client) {
        log.debug(`MQTT publish from ${client.id}: ${packet.topic} - ${packet.payload.toString()}`);

        // Match topic against all subscription patterns (including wildcards)
        for (const [pattern, handler] of this.subscriptions) {
          if (this.topicMatches(pattern, packet.topic)) {
            handler(packet.topic, packet.payload.toString());
          }
        }
      }
    });
  }

  /**
   * Match an MQTT topic against a subscription pattern with wildcards.
   * Supports MQTT wildcards: + (single level) and # (multi level).
   */
  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    // # must be last segment and matches everything after
    if (patternParts[patternParts.length - 1] === '#') {
      const prefixParts = patternParts.slice(0, -1);

      if (topicParts.length < prefixParts.length) {
        return false;
      }

      for (let i = 0; i < prefixParts.length; i++) {
        if (prefixParts[i] !== '+' && prefixParts[i] !== topicParts[i]) {
          return false;
        }
      }
      return true;
    }

    // Without #, exact segment count match required
    if (patternParts.length !== topicParts.length) {
      return false;
    }

    // Match each segment (+ matches any single segment)
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return true;
  }

  subscribe(topic: string, callback: (topic: string, payload: string) => void) {
    this.subscriptions.set(topic, callback);
    log.info(`Subscribed to MQTT topic: ${topic}`);
  }

  unsubscribe(topic: string) {
    this.subscriptions.delete(topic);
    log.info(`Unsubscribed from MQTT topic: ${topic}`);
  }

  /**
   * Publish a message and wait for a response on a different topic.
   * Follows the MQTT request-response pattern: subscribe to response topic,
   * publish the request, wait for response with timeout.
   *
   * @returns The response payload, or null if timeout expires
   */
  async publishAndAwaitResponse(
    requestTopic: string,
    requestPayload: string,
    responseTopic: string,
    timeoutMs: number,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        this.unsubscribe(responseTopic);
      };

      const handler = (_matchedTopic: string, payload: string) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(payload);
        }
      };

      // Subscribe to response topic BEFORE publishing request
      this.subscribe(responseTopic, handler);

      // Set timeout for response
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          log.warn(`Timeout waiting for response on ${responseTopic}`);
          resolve(null);
        }
      }, timeoutMs);

      // Publish the request
      this.publish(requestTopic, requestPayload).catch((err: unknown) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          log.error(`Failed to publish request to ${requestTopic}:`, err);
          resolve(null);
        }
      });
    });
  }

  publish(topic: string, payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Always use QoS 2 (exactly once delivery) for critical MQTT events
      // Use UDP for non-critical high-frequency data
      this.aedes.publish(
        {
          cmd: 'publish',
          qos: MQTT_QOS_LEVEL,
          dup: false,
          topic,
          payload: Buffer.from(payload),
          retain: false,
        },
        (err) => {
          if (err) {
            log.error(`Failed to publish to ${topic}:`, err);
            reject(err);
          } else {
            log.info(`Published to ${topic} (QoS ${MQTT_QOS_LEVEL}): ${payload}`);
            resolve();
          }
        },
      );
    });
  }

  start() {
    this.server.listen(this.port, () => {
      log.info(`Aedes MQTT Broker listening on port ${this.port}`);
      void this.startDiscoveryServices();
    });
  }

  private async startDiscoveryServices(): Promise<void> {
    const localIP = await getLocalIP();

    // Start all discovery services
    for (const service of this.discoveryServices) {
      service.start({ mqttPort: this.port, localIP });
    }
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Stop all discovery services
      for (const service of this.discoveryServices) {
        service.stop();
      }

      this.aedes.close(() => {
        this.server.close(() => {
          log.info('MQTT broker stopped');
          resolve();
        });
      });
    });
  }
}
