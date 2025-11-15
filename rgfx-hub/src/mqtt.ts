/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import Aedes from "aedes";
import { createServer, Server } from "node:net";
import { networkInterfaces } from "node:os";
import log from "electron-log/main";
import { Server as SSDPServer } from "node-ssdp";
import {
  MQTT_DEFAULT_PORT,
  MQTT_QOS_LEVEL,
  SSDP_PORT,
  SSDP_SERVICE_URN,
} from "./config/constants";

export class Mqtt {
  public aedes: Aedes; // Make public for MqttClientWrapper access
  private server: Server;
  private port: number;
  private subscriptions = new Map<
    string,
    (topic: string, payload: string) => void
  >();
  private ssdpServer?: SSDPServer;

  constructor(port = MQTT_DEFAULT_PORT) {
    this.port = port;
    this.aedes = new Aedes();
    this.server = createServer(this.aedes.handle);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.server.on("error", (err) => {
      log.error("MQTT server error:", err);
    });

    this.aedes.on("client", (client) => {
      log.info(`MQTT client connected: ${client.id}`);
    });

    this.aedes.on("clientDisconnect", (client) => {
      log.info(`MQTT client disconnected: ${client.id}`);
    });

    this.aedes.on("publish", (packet, client) => {
      if (client) {
        log.info(
          `MQTT publish from ${client.id}: ${packet.topic} - ${packet.payload.toString()}`,
        );

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
    const patternParts = pattern.split("/");
    const topicParts = topic.split("/");

    // # must be last segment and matches everything after
    if (patternParts[patternParts.length - 1] === "#") {
      const prefixParts = patternParts.slice(0, -1);
      if (topicParts.length < prefixParts.length) {
        return false;
      }
      for (let i = 0; i < prefixParts.length; i++) {
        if (prefixParts[i] !== "+" && prefixParts[i] !== topicParts[i]) {
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
      if (patternParts[i] !== "+" && patternParts[i] !== topicParts[i]) {
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
   */
  private getLocalIP(): string {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      const netInterfaces = nets[name];
      if (!netInterfaces) continue;

      for (const net of netInterfaces) {
        // Skip loopback, internal, and IPv6 addresses
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
    return "127.0.0.1"; // Fallback
  }

  publish(topic: string, payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Always use QoS 2 (exactly once delivery) for critical MQTT events
      // Use UDP for non-critical high-frequency data
      this.aedes.publish(
        {
          cmd: "publish",
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

      // Announce MQTT broker via SSDP
      const localIP = this.getLocalIP();
      const location = `http://${localIP}:${this.port}`;

      this.ssdpServer = new SSDPServer({
        location,
        // @ts-expect-error - sourcePort is required for M-SEARCH response but not in @types/node-ssdp
        sourcePort: SSDP_PORT,
      });

      this.ssdpServer.addUSN(SSDP_SERVICE_URN);

      try {
        void this.ssdpServer.start();
        log.info(`SSDP server started on port ${SSDP_PORT}`);
      } catch (err: unknown) {
        log.error(`Failed to start SSDP server:`, err);
      }

      log.info(`MQTT broker announced via SSDP at ${location}`);
      log.info(`SSDP USN: ${SSDP_SERVICE_URN}`);
    });
  }

  stop() {
    return new Promise<void>((resolve) => {
      // Stop SSDP server
      if (this.ssdpServer) {
        this.ssdpServer.stop();
      }

      this.aedes.close(() => {
        this.server.close(() => {
          log.info("MQTT broker stopped");
          resolve();
        });
      });
    });
  }
}
