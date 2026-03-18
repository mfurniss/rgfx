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
 */
export class MdnsDiscovery implements DiscoveryService {
  private bonjour?: Bonjour;
  private service?: Service;

  start(config: DiscoveryServiceConfig): void {
    const { mqttPort, localIP } = config;

    try {
      this.bonjour = new Bonjour();

      this.service = this.bonjour.publish({
        name: 'RGFX MQTT Broker',
        type: MDNS_SERVICE_TYPE,
        protocol: 'tcp',
        port: mqttPort,
        txt: { ip: localIP },
      });

      log.info(`mDNS discovery enabled: _${MDNS_SERVICE_TYPE}._tcp on port ${mqttPort}`);
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
