import os from 'os';
import { Bonjour, type Service } from 'bonjour-service';
import log from 'electron-log/main';
import { MDNS_SERVICE_TYPE } from '../config/constants';
import type { DiscoveryService, DiscoveryServiceConfig } from './discovery-service';

/**
 * mDNS-based discovery service for MQTT broker.
 * Advertises the broker as a _rgfx-mqtt._tcp service via multicast DNS.
 *
 * mDNS uses multicast group 224.0.0.251:5353, which Windows allows by default
 * (unlike UDP broadcast which is often blocked by Windows Firewall).
 * This makes it more reliable than UDP broadcast on Windows networks.
 *
 * Service name includes hostname to allow multiple hubs on the same network.
 */
export class MdnsDiscovery implements DiscoveryService {
  private bonjour?: Bonjour;
  private service?: Service;

  start(config: DiscoveryServiceConfig): void {
    const { mqttPort, localIP } = config;
    const serviceName = `RGFX Hub (${os.hostname()})`;

    try {
      this.bonjour = new Bonjour();

      this.service = this.bonjour.publish({
        name: serviceName,
        type: MDNS_SERVICE_TYPE,
        protocol: 'tcp',
        port: mqttPort,
        txt: { ip: localIP },
      });

      this.service.on('error', (err: Error) => {
        log.warn('mDNS service error:', err.message);
      });

      log.info(`mDNS discovery enabled: ${serviceName} _${MDNS_SERVICE_TYPE}._tcp on port ${mqttPort}`);
      log.info(`mDNS TXT record: ip=${localIP}`);
    } catch (err) {
      log.error('Failed to start mDNS discovery:', err);
    }
  }

  stop(): void {
    if (this.service?.stop != null) {
      (this.service.stop as () => void)();
      this.service = undefined;
    }

    if (this.bonjour) {
      this.bonjour.destroy();
      this.bonjour = undefined;
    }
  }
}
