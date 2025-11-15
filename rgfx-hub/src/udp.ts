/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import dgram from 'node:dgram';
import log from 'electron-log/main';
import type { EffectPayload } from './types/mapping-types';

export class Udp {
  private socket: dgram.Socket;
  public ip: string; // Make public so main.ts can access it
  private port: number;
  private onErrorCallback?: (error: Error) => void;
  private onSuccessCallback?: () => void;

  constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
    this.socket = dgram.createSocket('udp4');

    // Listen for socket-level errors (DNS, binding, network interface errors)
    this.socket.on('error', (err) => {
      log.error(`UDP socket error: ${err.message}`);
      this.onErrorCallback?.(err);
    });

    log.debug(`UDP configured for ${this.ip}:${this.port}`);
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.onErrorCallback = callback;
  }

  setSentCallback(callback: () => void) {
    this.onSuccessCallback = callback;
  }

  /**
   * Send effect payload to driver via UDP
   * @param payload Effect payload with semantic effect name and optional hints
   */
  send(payload: EffectPayload) {
    const message = JSON.stringify(payload);
    const buffer = Buffer.from(message);
    // Send with callback to detect errors and successes
    this.socket.send(buffer, 0, buffer.length, this.port, this.ip, (err) => {
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
    log.debug('UDP stopped');
  }
}
