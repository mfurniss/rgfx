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

  constructor(port = 1883) {
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

        // Check if we have a subscription handler for this topic
        const handler = this.subscriptions.get(packet.topic);
        handler?.(packet.topic, packet.payload.toString());
      }
    });
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
          qos: 2,
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
            log.info(`Published to ${topic} (QoS 2): ${payload}`);
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
        name: "RGFX Hub",
        type: "mqtt",
        port: this.port,
        host: "rgfx-hub.local", // Explicitly set hostname to avoid conflicts with macOS system hostname
        txt: {
          version: "1.0",
        },
      });
      log.info(
        'MQTT broker announced via mDNS as "RGFX Hub._mqtt._tcp" at rgfx-hub.local',
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
