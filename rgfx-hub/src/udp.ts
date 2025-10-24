import dgram from 'node:dgram';
import log from 'electron-log/main';

export class Udp {
  private socket: dgram.Socket;
  private ip: string;
  private port: number;
  private onErrorCallback?: (error: Error) => void;
  private onSuccessCallback?: () => void;

  constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
    this.socket = dgram.createSocket('udp4');
    log.info(`UDP configured for ${this.ip}:${this.port}`);
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.onErrorCallback = callback;
  }

  setSentCallback(callback: () => void) {
    this.onSuccessCallback = callback;
  }

  send(effect: string, color: string) {
    const message = JSON.stringify({ effect, color });
    // Send with callback to detect errors and successes
    this.socket.send(message, this.port, this.ip, (err) => {
      if (err) {
        log.error(`UDP send failed: ${err.message}`);
        if (this.onErrorCallback) {
          this.onErrorCallback(err);
        }
      } else {
        // Sent (not necessarily received due to UDP nature)
        if (this.onSuccessCallback) {
          this.onSuccessCallback();
        }
      }
    });
  }

  stop() {
    this.socket.close();
    log.info('UDP stopped');
  }
}
