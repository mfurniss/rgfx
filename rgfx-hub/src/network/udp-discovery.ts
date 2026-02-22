import { createSocket, Socket as DgramSocket } from 'node:dgram';
import log from 'electron-log/main';
import { UDP_DISCOVERY_PORT, UDP_DISCOVERY_INTERVAL_MS } from '../config/constants';
import { getBroadcastAddress } from '../network/network-utils';
import type { DiscoveryService, DiscoveryServiceConfig } from './discovery-service';
import { eventBus } from '../services/event-bus';

/**
 * UDP broadcast-based discovery service for MQTT broker.
 * Broadcasts JSON discovery messages to the network broadcast address.
 *
 * This is more reliable than SSDP multicast on consumer WiFi routers
 * where IGMP/multicast is often blocked.
 */
export class UdpDiscovery implements DiscoveryService {
  private socket?: DgramSocket;
  private broadcastInterval?: NodeJS.Timeout;

  start(config: DiscoveryServiceConfig): void {
    const { mqttPort, localIP } = config;

    this.socket = createSocket('udp4');

    this.socket.on('error', (err) => {
      log.error('UDP discovery socket error:', err);
    });

    this.socket.bind(() => {
      this.socket?.setBroadcast(true);
      log.info(`UDP discovery enabled on port ${UDP_DISCOVERY_PORT}`);

      // Send initial broadcast immediately
      this.broadcast(localIP, mqttPort);

      // Set up periodic broadcasts
      this.broadcastInterval = setInterval(() => {
        this.broadcast(localIP, mqttPort);
      }, UDP_DISCOVERY_INTERVAL_MS);

      log.info(
        `Broadcasting MQTT broker discovery every ${UDP_DISCOVERY_INTERVAL_MS / 1000}s via UDP broadcast`,
      );
    });
  }

  stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = undefined;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }

  private broadcast(localIP: string, mqttPort: number): void {
    if (!this.socket) {
      return;
    }

    const message = JSON.stringify({
      service: 'rgfx-mqtt-broker',
      ip: localIP,
      port: mqttPort,
    });

    const broadcastAddress = getBroadcastAddress(localIP);

    this.socket.send(message, UDP_DISCOVERY_PORT, broadcastAddress, (err) => {
      if (err) {
        log.error('Failed to send discovery broadcast:', err);

        // Network unreachable indicates network change (e.g., WiFi switch)
        const errorCode = (err as NodeJS.ErrnoException).code;

        if (errorCode === 'ENETUNREACH') {
          eventBus.emit('network:error', { code: errorCode });
        }
      } else {
        log.debug(`Sent discovery broadcast to ${broadcastAddress}:${UDP_DISCOVERY_PORT}`);
      }
    });
  }
}
