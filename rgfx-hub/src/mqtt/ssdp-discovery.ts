/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { Server as SSDPServer } from 'node-ssdp';
import log from 'electron-log/main';
import { SSDP_PORT, SSDP_SERVICE_URN } from '../config/constants';
import type { DiscoveryService, DiscoveryServiceConfig } from './discovery-service';

/**
 * SSDP-based discovery service for MQTT broker.
 * Broadcasts NOTIFY messages to the multicast address 239.255.255.250:1900.
 *
 * Note: SSDP multicast is often blocked on consumer WiFi routers due to IGMP filtering.
 * UDP broadcast discovery (UdpDiscovery) is more reliable for home networks.
 */
export class SsdpDiscovery implements DiscoveryService {
  private ssdpServer?: SSDPServer;

  start(config: DiscoveryServiceConfig): void {
    const { mqttPort, localIP } = config;
    const location = `http://${localIP}:${mqttPort}`;

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
        log.info(`Broadcasting NOTIFY messages every 10 seconds to 239.255.255.250:1900`);

        // Manually trigger first advertisement immediately
        this.ssdpServer?.advertise();
        log.info(`Sent initial SSDP NOTIFY advertisement`);
      })
      .catch((err: unknown) => {
        log.error(`Failed to start SSDP server:`, err);
      });

    log.info(`MQTT broker announced via SSDP at ${location}`);
    log.info(`SSDP USN: ${SSDP_SERVICE_URN}`);
  }

  stop(): void {
    if (this.ssdpServer) {
      this.ssdpServer.stop();
      this.ssdpServer = undefined;
    }
  }
}
