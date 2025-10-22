import Aedes from 'aedes';
import { createServer, Server } from 'node:net';
import log from 'electron-log/main';

export class Mqtt {
  private aedes: Aedes;
  private server: Server;
  private port: number;
  private subscriptions: Map<string, (topic: string, payload: string) => void> = new Map();

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

  start() {
    this.server.listen(this.port, () => {
      log.info(`Aedes MQTT Broker listening on port ${this.port}`);
    });
  }

  stop() {
    return new Promise<void>((resolve) => {
      this.aedes.close(() => {
        this.server.close(() => {
          log.info('MQTT broker stopped');
          resolve();
        });
      });
    });
  }
}
