import Aedes from 'aedes';
import { createServer, Server } from 'node:net';
import log from 'electron-log/main';
import Bonjour from 'bonjour-service';

export class Mqtt {
  private aedes: Aedes;
  private server: Server;
  private port: number;
  private subscriptions: Map<string, (topic: string, payload: string) => void> = new Map();
  private bonjour?: Bonjour;
  private mdnsService?: any;

  constructor(port: number = 1883) {
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

        // Check if we have a subscription handler for this topic
        const handler = this.subscriptions.get(packet.topic);
        if (handler) {
          handler(packet.topic, packet.payload.toString());
        }
      }
    });
  }

  subscribe(topic: string, callback: (topic: string, payload: string) => void) {
    this.subscriptions.set(topic, callback);
    log.info(`Subscribed to MQTT topic: ${topic}`);
  }

  publish(topic: string, payload: string) {
    this.aedes.publish(
      {
        cmd: 'publish',
        qos: 0,
        dup: false,
        topic,
        payload: Buffer.from(payload),
        retain: false,
      },
      (err) => {
        if (err) {
          log.error(`Failed to publish to ${topic}:`, err);
        } else {
          log.info(`Published to ${topic}: ${payload}`);
        }
      }
    );
  }

  start() {
    this.server.listen(this.port, () => {
      log.info(`Aedes MQTT Broker listening on port ${this.port}`);

      // Announce MQTT broker via mDNS
      this.bonjour = new Bonjour();
      this.mdnsService = this.bonjour.publish({
        name: 'RGFX Hub',
        type: 'mqtt',
        port: this.port,
        host: 'rgfx-hub.local',  // Explicitly set hostname to avoid conflicts with macOS system hostname
        txt: {
          version: '1.0'
        }
      });
      log.info('MQTT broker announced via mDNS as "RGFX Hub._mqtt._tcp" at rgfx-hub.local');
    });
  }

  stop() {
    return new Promise<void>((resolve) => {
      // Unpublish mDNS service
      if (this.mdnsService) {
        this.mdnsService.stop();
      }
      if (this.bonjour) {
        this.bonjour.destroy();
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
