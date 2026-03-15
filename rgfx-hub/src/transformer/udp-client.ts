/**
 * UDP client wrapper for event transformers
 *
 * Provides high-level interface for broadcasting effects to LED drivers.
 * Uses DriverRegistry to discover connected drivers and their IP addresses.
 * Maintains a single reusable UDP socket for efficient message sending.
 */

import dgram from 'dgram';
import log from 'electron-log/main';
import type { UdpClient, EffectPayload } from '../types/transformer-types';
import type { DriverRegistry } from '../driver-registry';
import type { SystemMonitor } from '../system-monitor';
import type { Driver } from '../types';
import { UDP_PORT, UDP_BUFFER_SIZE } from '../config/constants';
import { eventBus } from '../services/event-bus';
import { VideoPlayer } from '../video-player';
import type { VideoPlayOptions } from '../video-player';

/**
 * UDP client implementation for broadcasting effects to drivers
 *
 * Maintains a single reusable UDP socket and broadcasts
 * semantic effect payloads as JSON to connected drivers.
 */
export class UdpClientImpl implements UdpClient {
  private socket: dgram.Socket;
  private closed = false;
  private driverFallbackEnabled = false;
  private videoPlayer: VideoPlayer;

  constructor(
    private driverRegistry: DriverRegistry,
    private systemMonitor: SystemMonitor,
  ) {
    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', (err) => {
      log.error(`UDP client socket error: ${err.message}`);
    });
    log.debug('UDP client socket initialized');

    this.videoPlayer = new VideoPlayer();
    this.videoPlayer.init().catch((err: unknown) => {
      log.error(`VideoPlayer init failed: ${String(err)}`);
    });
  }

  setDriverFallbackEnabled(enabled: boolean): void {
    this.driverFallbackEnabled = enabled;
    log.info(`Driver fallback mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Broadcast effect to all connected drivers or selective drivers if specified
   * @param payload Effect payload with semantic data and optional driver targeting
   * @returns true (for mapper return convenience)
   */
  broadcast(payload: EffectPayload): boolean {
    if (this.closed) {
      return false;
    }

    // Intercept video effect — delegate to VideoPlayer instead of JSON UDP
    if (payload.effect === 'video') {
      return this.handleVideoEffect(payload);
    }

    // Extract drivers property for routing, don't send it in UDP payload
    const { drivers: targetDriverIds, ...effectData } = payload;

    // Get all connected drivers, excluding disabled ones
    let drivers = this.driverRegistry.getConnectedDrivers().filter((d) => !d.disabled);

    // Apply selective routing if specified
    if (targetDriverIds?.length) {
      // Resolve '*' wildcards to actual driver IDs
      const resolvedIds = this.resolveRandomDrivers(targetDriverIds, drivers);

      // Filter drivers by resolved IDs
      drivers = drivers.filter(({ id }) => resolvedIds.includes(id));

      if (drivers.length === 0) {
        if (this.driverFallbackEnabled) {
          const allConnected = this.driverRegistry
            .getConnectedDrivers().filter((d) => !d.disabled);

          if (allConnected.length > 0) {
            drivers = [allConnected[0]];
            log.info(`Driver fallback: routing to ${drivers[0].id} (targets: ${targetDriverIds.join(', ')})`);
          } else {
            log.warn('Driver fallback: no connected drivers available');
          }
        } else {
          log.warn(`No drivers matched selective routing targets: ${targetDriverIds.join(', ')}`);
        }
      }
    }

    // Pre-serialize JSON once for all drivers (avoid repeated stringify)
    const buffer = Buffer.from(JSON.stringify(effectData));

    // Validate packet size before sending
    if (buffer.length > UDP_BUFFER_SIZE) {
      const { effect } = effectData;
      log.warn(
        `UDP packet too large: ${buffer.length} bytes (max ${UDP_BUFFER_SIZE}), effect: ${effect}`,
      );
      eventBus.emit('system:error', {
        errorType: 'network',
        message: `UDP packet too large: ${buffer.length} bytes (max ${UDP_BUFFER_SIZE})`,
        timestamp: Date.now(),
        details: `Effect: ${effect}`,
      });
      return false;
    }

    for (const driver of drivers) {
      this.sendBufferToDriver(driver, buffer);
    }

    // Always send to localhost for led-sim
    this.socket.send(buffer, UDP_PORT, '127.0.0.1', (err) => {
      if (err) {
        log.error(`UDP send to localhost failed: ${err.message}`);
      }
    });

    if (targetDriverIds?.length) {
      log.debug(`UDP broadcast: targets=${targetDriverIds.join(',')} → ${drivers.length} drivers matched`);
    }

    return true;
  }

  /**
   * Resolve wildcards in target IDs to actual random driver IDs
   * Wildcards: '*' = any driver, '*S' = strip driver, '*M' = matrix driver
   * - Typed wildcards (*S, *M) are resolved first to ensure they get matching drivers
   * - Each wildcard picks a unique random driver from the appropriate pool
   * - Named drivers are excluded from the random pool
   */
  private resolveRandomDrivers(targetIds: string[], connectedDrivers: Driver[]): string[] {
    const namedIds: string[] = [];
    let stripCount = 0;
    let matrixCount = 0;
    let anyCount = 0;

    for (const id of targetIds) {
      if (id === '*S') {
        stripCount++;
      } else if (id === '*M') {
        matrixCount++;
      } else if (id === '*') {
        anyCount++;
      } else {
        namedIds.push(id);
      }
    }

    if (stripCount === 0 && matrixCount === 0 && anyCount === 0) {
      return namedIds;
    }

    // Build pool excluding named drivers
    const availableDrivers = connectedDrivers.filter((d) => !namedIds.includes(d.id));
    const selectedIds = [...namedIds];

    // Helper to pick random drivers from a filtered pool
    const pickRandom = (pool: Driver[], count: number): void => {
      const poolCopy = [...pool];

      for (let i = 0; i < count && poolCopy.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * poolCopy.length);
        const picked = poolCopy.splice(randomIndex, 1)[0];
        selectedIds.push(picked.id);
      }
    };

    // Track which drivers have been selected to avoid duplicates
    const remainingPool = [...availableDrivers];

    const removeFromPool = (id: string) => {
      const idx = remainingPool.findIndex((d) => d.id === id);

      if (idx >= 0) {
        remainingPool.splice(idx, 1);
      }
    };

    // Resolve *S (strip) wildcards first
    if (stripCount > 0) {
      const stripPool = remainingPool.filter((d) => d.resolvedHardware?.layout === 'strip');
      const beforeCount = selectedIds.length;
      pickRandom(stripPool, stripCount);

      // Remove picked drivers from remaining pool
      for (let i = beforeCount; i < selectedIds.length; i++) {
        removeFromPool(selectedIds[i]);
      }
    }

    // Resolve *M (matrix) wildcards second
    if (matrixCount > 0) {
      const matrixPool = remainingPool.filter(
        (d) => d.resolvedHardware?.layout.startsWith('matrix-') ?? false,
      );
      const beforeCount = selectedIds.length;
      pickRandom(matrixPool, matrixCount);

      // Remove picked drivers from remaining pool
      for (let i = beforeCount; i < selectedIds.length; i++) {
        removeFromPool(selectedIds[i]);
      }
    }

    // Resolve * (any) wildcards last from remaining pool
    if (anyCount > 0) {
      pickRandom(remainingPool, anyCount);
    }

    return selectedIds;
  }

  /**
   * Send pre-serialized buffer to a driver (used by broadcast for efficiency)
   */
  private sendBufferToDriver(driver: Driver, buffer: Buffer): void {
    const { ip } = driver;

    if (!ip) {
      return;
    }

    this.socket.send(buffer, UDP_PORT, ip, (err) => {
      this.systemMonitor.trackUdpSent(driver.id, !err);

      if (err) {
        log.error(`UDP send to ${ip} failed: ${err.message}`);
      } else {
        log.debug(`Sent effect to driver ${driver.id} (${ip})`);
      }
    });
  }

  /**
   * Handle video effect — start/stop video playback via VideoPlayer
   */
  private handleVideoEffect(payload: EffectPayload): boolean {
    const props = (payload.props ?? payload) as Record<string, unknown>;

    // Stop command
    if (props.action === 'stop') {
      this.videoPlayer.stop((stopPayload) => {
        this.broadcastJsonDirect(stopPayload as EffectPayload);
      });
      return true;
    }

    // Play command requires a file path
    const file = props.file as string | undefined;

    if (!file) {
      log.warn('Video effect requires "file" prop');
      return false;
    }

    if (!this.videoPlayer.isFfmpegAvailable()) {
      log.warn('Video effect unavailable: ffmpeg not found');
      eventBus.emit('system:error', {
        errorType: 'video',
        message: 'ffmpeg not found — install ffmpeg to use video effects',
        timestamp: Date.now(),
      });
      return false;
    }

    // Resolve target drivers
    let drivers = this.driverRegistry
      .getConnectedDrivers()
      .filter((d) => !d.disabled);

    if (payload.drivers?.length) {
      const targetIds = payload.drivers;
      drivers = drivers.filter(({ id }) => targetIds.includes(id));
    }

    if (drivers.length === 0) {
      log.warn('No connected drivers for video playback');
      return false;
    }

    const options: VideoPlayOptions = {
      fps: typeof props.fps === 'number' ? props.fps : undefined,
      loop: typeof props.loop === 'boolean' ? props.loop : false,
    };

    // Delegate to VideoPlayer — broadcast start/stop via this.broadcast
    this.videoPlayer.play(file, options, drivers, (startStopPayload) => {
      // Send start/stop JSON commands via normal UDP path
      // Use direct JSON broadcast to avoid re-entering handleVideoEffect
      this.broadcastJsonDirect(startStopPayload as EffectPayload);
    });

    return true;
  }

  /**
   * Send JSON effect payload directly without video interception.
   * Used by VideoPlayer to send start/stop commands.
   */
  private broadcastJsonDirect(payload: EffectPayload): void {
    const { drivers: targetDriverIds, ...effectData } = payload;

    let drivers = this.driverRegistry
      .getConnectedDrivers()
      .filter((d) => !d.disabled);

    if (targetDriverIds?.length) {
      drivers = drivers.filter(({ id }) => targetDriverIds.includes(id));
    }

    const buffer = Buffer.from(JSON.stringify(effectData));

    for (const driver of drivers) {
      this.sendBufferToDriver(driver, buffer);
    }

    // Also send to localhost for led-sim
    this.socket.send(buffer, UDP_PORT, '127.0.0.1', (err) => {
      if (err) {
        log.error(`UDP send to localhost failed: ${err.message}`);
      }
    });
  }

  /**
   * Stop the UDP client and close the socket
   */
  stop(): void {
    this.closed = true;
    this.videoPlayer.destroy();
    this.socket.close();
    log.debug('UDP client socket closed');
  }
}
