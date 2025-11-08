/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import Aedes from "aedes";
import { createServer, Server } from "node:net";
import log from "electron-log/main";
import Bonjour from "bonjour-service";
import { MQTT_DEFAULT_PORT, MQTT_QOS_LEVEL, MDNS_SERVICE_NAME, MDNS_SERVICE_TYPE, MDNS_HOSTNAME } from "./config/constants";

export class Mqtt {
  public aedes: Aedes; // Make public for MqttClientWrapper access
  private server: Server;
  private port: number;
  private subscriptions = new Map<
    string,
    (topic: string, payload: string) => void
  >();
  private bonjour?: Bonjour;
  private mdnsService?: ReturnType<Bonjour["publish"]>;

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

      // Announce MQTT broker via mDNS
      this.bonjour = new Bonjour();
      this.mdnsService = this.bonjour.publish({
        name: MDNS_SERVICE_NAME,
        type: MDNS_SERVICE_TYPE,
        port: this.port,
        host: MDNS_HOSTNAME, // Explicitly set hostname to avoid conflicts with macOS system hostname
        txt: {
          version: "1.0",
        },
      });
      log.info(
        `MQTT broker announced via mDNS as "${MDNS_SERVICE_NAME}._${MDNS_SERVICE_TYPE}._tcp" at ${MDNS_HOSTNAME}`,
      );
    });
  }

  stop() {
    return new Promise<void>((resolve) => {
      // Unpublish mDNS service
      if (this.mdnsService) {
        this.mdnsService.stop?.();
      }
      if (this.bonjour) {
        this.bonjour.destroy();
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
