/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import dgram from 'dgram';
import { ipcMain } from 'electron';
import log from 'electron-log/main';
import { UDP_PORT } from '../config/constants';
import type { UdpClient, EffectPayload } from '../types/transformer-types';
import type { DriverRegistry } from '../driver-registry';
import { safeValidateEffectProps } from '../schemas';
import { eventBus } from '../services/event-bus';

interface TriggerEffectHandlerDeps {
  udpClient: UdpClient;
  driverRegistry: DriverRegistry;
}

export function registerTriggerEffectHandler(deps: TriggerEffectHandlerDeps): void {
  const { udpClient, driverRegistry } = deps;
  log.info('[TriggerEffectHandler] Registering effect:trigger IPC handler');

  // Socket for sending to localhost (led-sim)
  const localhostSocket = dgram.createSocket('udp4');

  ipcMain.handle('effect:trigger', (_event, payload: EffectPayload) => {
    try {
      // Validate and apply schema defaults to props
      const result = safeValidateEffectProps(payload.effect, payload.props);

      if (!result.success) {
        log.error('Invalid effect props:', result.error, {
          effect: payload.effect,
          props: payload.props,
        });
        eventBus.emit('system:error', {
          errorType: 'general',
          message: `Invalid effect props for ${payload.effect}: ${result.error.message}`,
          timestamp: Date.now(),
          details: JSON.stringify(payload.props, null, 2),
        });
        throw new Error(`Invalid effect props: ${result.error.message}`);
      }

      const validatedProps = result.data as Record<string, unknown>;

      // Extract and remove stripLifespanScale from payload (not sent to drivers)
      const { stripLifespanScale, drivers: targetDriverIds, ...rest } = payload;
      const scale = typeof stripLifespanScale === 'number' ? stripLifespanScale : 1.0;
      const hasLifespan = typeof validatedProps.lifespan === 'number';
      const needsScaling = hasLifespan && scale < 1.0;

      if (needsScaling && targetDriverIds?.length) {
        // Partition target drivers into strips and non-strips
        const stripIds: string[] = [];
        const nonStripIds: string[] = [];

        for (const id of targetDriverIds) {
          const driver = driverRegistry.getDriver(id);

          if (driver?.resolvedHardware?.layout === 'strip') {
            stripIds.push(id);
          } else {
            nonStripIds.push(id);
          }
        }

        // Broadcast to non-strips with original lifespan
        if (nonStripIds.length > 0) {
          const nonStripPayload: EffectPayload = {
            ...rest,
            props: validatedProps,
            drivers: nonStripIds,
          };
          udpClient.broadcast(nonStripPayload);
        }

        // Broadcast to strips with scaled lifespan
        if (stripIds.length > 0) {
          const scaledLifespan = Math.round((validatedProps.lifespan as number) * scale);
          const stripPayload: EffectPayload = {
            ...rest,
            props: { ...validatedProps, lifespan: scaledLifespan },
            drivers: stripIds,
          };
          udpClient.broadcast(stripPayload);
        }
      } else {
        // No scaling needed - broadcast to all targets
        const validatedPayload: EffectPayload = {
          ...rest,
          props: validatedProps,
          drivers: targetDriverIds,
        };
        udpClient.broadcast(validatedPayload);
      }

      // Also send to localhost for led-sim (with original lifespan)
      const effectData = { ...rest, props: validatedProps };
      const message = Buffer.from(JSON.stringify(effectData));
      localhostSocket.send(message, UDP_PORT, '127.0.0.1');

      log.info(`Effect broadcast: ${payload.effect}`, { ...rest, props: validatedProps });
    } catch (error) {
      log.error('Failed to broadcast effect:', error);
      throw error;
    }
  });
}
