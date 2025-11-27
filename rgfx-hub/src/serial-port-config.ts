/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { session } from 'electron';
import log from 'electron-log/main';

export function configureSerialPort(): void {
  session.defaultSession.on('select-serial-port', (event, portList, webContents, callback) => {
    log.info(`Serial port request from ${webContents.getURL()}`);
    log.info(
      `Available ports: ${portList.map((p) => `${p.displayName ?? p.portName} (VID=${p.vendorId} PID=${p.productId})`).join(', ')}`,
    );

    if (portList.length === 1) {
      log.info(`Auto-selecting single port: ${portList[0].portName}`);
      callback(portList[0].portId);
    } else if (portList.length === 0) {
      log.warn('No serial ports available');
      callback('');
    } else {
      event.preventDefault();

      const esp32Port = portList.find((p) => {
        const vid = p.vendorId;
        const pid = p.productId;
        return (
          (vid === '10c4' && pid === 'ea60') || // CP2102
          (vid === '1a86' && pid === '7523') || // CH340
          (vid === '0403' && pid === '6001') || // FTDI
          vid === '303a' // Espressif native USB
        );
      });

      if (esp32Port) {
        log.info(`Auto-selecting ESP32 port: ${esp32Port.portName}`);
        callback(esp32Port.portId);
      } else {
        log.info(`Auto-selecting first port: ${portList[0].portName}`);
        callback(portList[0].portId);
      }
    }
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'serial') {
      return true;
    }
    return true;
  });

  session.defaultSession.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') {
      return true;
    }
    return true;
  });
}
