import dgram from "node:dgram";
import log from "electron-log/main";

export class Udp {
  private socket: dgram.Socket;
  public ip: string; // Make public so main.ts can access it
  private port: number;
  private onErrorCallback?: (error: Error) => void;
  private onSuccessCallback?: () => void;

  constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
    this.socket = dgram.createSocket("udp4");

    // Listen for socket-level errors (DNS, binding, network interface errors)
    this.socket.on("error", (err) => {
      log.error(`UDP socket error: ${err.message}`);
      this.onErrorCallback?.(err);
    });

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
        this.onErrorCallback?.(err);
      } else {
        // Sent (not necessarily received due to UDP nature)
        this.onSuccessCallback?.();
      }
    });
  }

  stop() {
    this.socket.close();
    log.info("UDP stopped");
  }
}
