import dgram from 'node:dgram';
import log from 'electron-log/main';

export class Udp {
  private socket: dgram.Socket;
  private ip: string;
  private port: number;

  constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
    this.socket = dgram.createSocket('udp4');
    log.info(`UDP configured for ${this.ip}:${this.port}`);
  }

  send(effect: string, color: string) {
    const message = JSON.stringify({ effect, color });
    // Send without callback for minimal latency (fire and forget)
    this.socket.send(message, this.port, this.ip);
  }

  stop() {
    this.socket.close();
    log.info('UDP stopped');
  }
}
