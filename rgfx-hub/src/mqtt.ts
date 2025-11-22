/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import Aedes from 'aedes';
import { createServer, Server } from 'node:net';
import { networkInterfaces } from 'node:os';
import log from 'electron-log/main';
import { Server as SSDPServer } from 'node-ssdp';
import { createSocket, Socket as DgramSocket } from 'node:dgram';
import { MQTT_DEFAULT_PORT, MQTT_QOS_LEVEL, SSDP_PORT, SSDP_SERVICE_URN } from './config/constants';

const DISCOVERY_PORT = 8889;
const DISCOVERY_INTERVAL_MS = 5000; // Broadcast every 5 seconds

export class Mqtt {
  public aedes: Aedes; // Make public for MqttClientWrapper access
  private server: Server;
  private port: number;
  private subscriptions = new Map<string, (topic: string, payload: string) => void>();
  private ssdpServer?: SSDPServer;
  private discoverySocket?: DgramSocket;
  private discoveryInterval?: NodeJS.Timeout;

  constructor(port = MQTT_DEFAULT_PORT) {
    this.port = port;
    this.aedes = new Aedes();
    this.server = createServer(this.aedes.handle);
    this.setupEventHandlers();
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
        log.info(`MQTT publish from ${client.id}: ${packet.topic} - ${packet.payload.toString()}`);

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

  /**
   * Get the local IP address (IPv4, non-loopback, non-internal)
   * Prefers WiFi/Ethernet interfaces (en0, en1) over other interfaces
   */
  private getLocalIP(): string {
    const nets = networkInterfaces();
    const candidates: { name: string; address: string }[] = [];

    // Collect all non-loopback IPv4 addresses
    for (const name of Object.keys(nets)) {
      const netInterfaces = nets[name];
      if (!netInterfaces) continue;

      for (const net of netInterfaces) {
        if (net.family === 'IPv4' && !net.internal) {
          candidates.push({ name, address: net.address });
        }
      }
    }

    log.info(
      `Detected network interfaces: ${candidates.map((c) => `${c.name}=${c.address}`).join(', ')}`
    );

    // Prefer WiFi/Ethernet interfaces (en0, en1, eth0, etc.)
    const preferred = candidates.find(
      (c) => c.name.startsWith('en') || c.name.startsWith('eth')
    );
    if (preferred) {
      log.info(`Selected interface ${preferred.name} with IP ${preferred.address}`);
      return preferred.address;
    }

    // Fallback to first candidate or localhost
    if (candidates.length > 0) {
      log.info(
        `Using first available interface ${candidates[0].name} with IP ${candidates[0].address}`
      );
      return candidates[0].address;
    }

    log.warn('No network interfaces found, using localhost');
    return '127.0.0.1';
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
        }
      );
    });
  }

  start() {
    this.server.listen(this.port, () => {
      log.info(`Aedes MQTT Broker listening on port ${this.port}`);

      // Announce MQTT broker via SSDP
      const localIP = this.getLocalIP();
      const location = `http://${localIP}:${this.port}`;

      this.ssdpServer = new SSDPServer({
        location,
        // @ts-expect-error - sourcePort, adInterval, ttl not in @types/node-ssdp but exist in implementation
        sourcePort: SSDP_PORT,
        adInterval: 10000, // Broadcast every 10 seconds
        ttl: 4, // Multicast TTL hops
      });

      this.ssdpServer.addUSN(SSDP_SERVICE_URN);

      // Start SSDP server and begin broadcasting
      (this.ssdpServer.start() as Promise<void>)
        .then(() => {
          log.info(`SSDP server started on port ${SSDP_PORT}`);
          log.info(
            `Broadcasting NOTIFY messages every 10 seconds to 239.255.255.250:1900`
          );

          // Manually trigger first advertisement immediately to verify it works
           
          this.ssdpServer?.advertise();
          log.info(`Sent initial SSDP NOTIFY advertisement`);
        })
        .catch((err: unknown) => {
          log.error(`Failed to start SSDP server:`, err);
        });

      log.info(`MQTT broker announced via SSDP at ${location}`);
      log.info(`SSDP USN: ${SSDP_SERVICE_URN}`);

      // Start UDP broadcast discovery (more reliable than SSDP multicast on consumer WiFi)
      this.startUDPDiscovery(localIP);
    });
  }

  private startUDPDiscovery(localIP: string) {
    this.discoverySocket = createSocket('udp4');

    this.discoverySocket.on('error', (err) => {
      log.error('UDP discovery socket error:', err);
    });

    this.discoverySocket.bind(() => {
      this.discoverySocket?.setBroadcast(true);
      log.info(`UDP discovery enabled on port ${DISCOVERY_PORT}`);

      // Send initial broadcast immediately
      this.broadcastDiscovery(localIP);

      // Set up periodic broadcasts
      this.discoveryInterval = setInterval(() => {
        this.broadcastDiscovery(localIP);
      }, DISCOVERY_INTERVAL_MS);

      log.info(
        `Broadcasting MQTT broker discovery every ${DISCOVERY_INTERVAL_MS / 1000}s via UDP broadcast`
      );
    });
  }

  private broadcastDiscovery(localIP: string) {
    if (!this.discoverySocket) return;

    // Simple JSON message with broker info
    const message = JSON.stringify({
      service: 'rgfx-mqtt-broker',
      ip: localIP,
      port: this.port,
    });

    const broadcast = localIP.split('.').slice(0, 3).join('.') + '.255';

    this.discoverySocket.send(message, DISCOVERY_PORT, broadcast, (err) => {
      if (err) {
        log.error('Failed to send discovery broadcast:', err);
      } else {
        log.debug(`Sent discovery broadcast to ${broadcast}:${DISCOVERY_PORT}`);
      }
    });
  }

  stop() {
    return new Promise<void>((resolve) => {
      // Stop SSDP server
      if (this.ssdpServer) {
        this.ssdpServer.stop();
      }

      // Stop UDP discovery
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
      }
      if (this.discoverySocket) {
        this.discoverySocket.close();
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
