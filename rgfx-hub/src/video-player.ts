/**
 * Video Player
 *
 * Transcodes video files using ffmpeg and streams raw RGB24 frames
 * to ESP32 drivers via a binary UDP protocol on UDP_PORT.
 *
 * Supports per-driver scaling when drivers have different matrix dimensions.
 * Frame pacing is hub-driven with automatic frame dropping when behind.
 */

import { spawn, execFile } from 'child_process';
import type { ChildProcess } from 'child_process';
import dgram from 'dgram';
import { isAbsolute, join } from 'path';
import log from 'electron-log/main';
import { UDP_PORT } from './config/constants';
import { CONFIG_DIRECTORY } from './config/paths';
import type { Driver } from './types';

// Protocol constants (must match ESP32 udp_video.h)
const VIDEO_MAGIC = 0x56;
const VIDEO_FLAG_LAST_FRAGMENT = 0x01;
const VIDEO_HEADER_SIZE = 8;
// WiFi effective MTU is ~1460 (vs 1472 theoretical). Use 1400 for safe headroom.
const VIDEO_MAX_PACKET_SIZE = 1400;
const VIDEO_MAX_PAYLOAD = VIDEO_MAX_PACKET_SIZE - VIDEO_HEADER_SIZE; // 1392 bytes

type VideoFitMode = 'crop' | 'stretch';

export interface VideoPlayOptions {
  fps?: number;
  loop?: boolean;
  fit?: VideoFitMode;
}

// Default frame rate when source fps is unknown and no override specified
const DEFAULT_FPS = 30;

interface DriverGroup {
  width: number;
  height: number;
  drivers: Driver[];
  ffmpeg?: ChildProcess;
  frameSize: number;
  sequenceNumber: number;
  pendingFrame?: Buffer;
  paceTimer?: ReturnType<typeof setInterval>;
  statusTimer?: ReturnType<typeof setInterval>;
  framesSent: number;
  framesDropped: number;
}

/**
 * Resolve a video file path.
 * Absolute paths pass through; relative paths are resolved against CONFIG_DIRECTORY.
 */
export function resolveVideoPath(filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }
  return join(CONFIG_DIRECTORY, filePath);
}

/**
 * Get the effective matrix dimensions for a driver.
 * Accounts for unified panel configurations.
 */
export function getDriverMatrixDimensions(
  driver: Driver,
): { width: number; height: number } | null {
  const hw = driver.resolvedHardware;

  if (!hw) {
    return null;
  }

  let panelW = hw.width ?? hw.count;
  let panelH = hw.height ?? 1;

  const unified = driver.ledConfig?.unified;

  if (unified && unified.length > 0 && unified[0].length > 0) {
    // Check first panel's rotation — 'b' (90°) or 'd' (270°) swaps dimensions
    const firstEntry = unified[0][0];
    const rot = firstEntry.length > 1 ? firstEntry[firstEntry.length - 1] : 'a';

    if ((rot === 'b' || rot === 'd') && panelW !== panelH) {
      [panelW, panelH] = [panelH, panelW];
    }

    return {
      width: panelW * unified[0].length,
      height: panelH * unified.length,
    };
  }

  // Single panel rotation
  const rotation = driver.ledConfig?.rotation;

  if ((rotation === '90' || rotation === '270') && panelW !== panelH) {
    return { width: panelH, height: panelW };
  }

  return { width: panelW, height: panelH };
}

/**
 * Build a video frame UDP packet with header.
 */
export function buildVideoPacket(
  payload: Buffer,
  sequence: number,
  totalSize: number,
  fragmentOffset: number,
  lastFragment: boolean,
): Buffer {
  const header = Buffer.alloc(VIDEO_HEADER_SIZE);
  header[0] = VIDEO_MAGIC;
  header[1] = lastFragment ? VIDEO_FLAG_LAST_FRAGMENT : 0;
  header.writeUInt16BE(sequence & 0xffff, 2);
  header.writeUInt16BE(totalSize, 4);
  header.writeUInt16BE(fragmentOffset, 6);
  return Buffer.concat([header, payload]);
}

/**
 * Fragment and send a frame to a list of drivers.
 */
function sendFrame(
  socket: dgram.Socket,
  frameData: Buffer,
  group: DriverGroup,
): void {
  const { frameSize, drivers } = group;
  group.sequenceNumber = (group.sequenceNumber + 1) & 0xffff;
  const seq = group.sequenceNumber;

  let offset = 0;

  while (offset < frameSize) {
    const remaining = frameSize - offset;
    const payloadSize = Math.min(remaining, VIDEO_MAX_PAYLOAD);
    const lastFragment = offset + payloadSize >= frameSize;

    const packet = buildVideoPacket(
      frameData.subarray(offset, offset + payloadSize),
      seq,
      frameSize,
      offset,
      lastFragment,
    );

    for (const driver of drivers) {
      if (driver.ip) {
        socket.send(packet, UDP_PORT, driver.ip, (err) => {
          if (err) {
            log.error(`Video UDP send error to ${driver.ip}: ${err.message}`);
          }
        });
      }
    }

    offset += payloadSize;
  }
}

/**
 * Detect the system ffmpeg binary path.
 * Returns the path or null if not found.
 */
function detectFfmpeg(): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFile(cmd, ['ffmpeg'], (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const path = stdout.trim().split('\n')[0];
      resolve(path || null);
    });
  });
}

export class VideoPlayer {
  private socket: dgram.Socket;
  private groups: DriverGroup[] = [];
  private playing = false;
  private ffmpegPath: string | null = null;
  private frameTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', (err) => {
      log.error(`Video UDP socket error: ${err.message}`);
    });
  }

  async init(): Promise<void> {
    this.ffmpegPath = await detectFfmpeg();

    if (this.ffmpegPath) {
      log.info(`ffmpeg detected at: ${this.ffmpegPath}`);
    } else {
      log.warn('ffmpeg not found — video effect will not be available');
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  isFfmpegAvailable(): boolean {
    return this.ffmpegPath !== null;
  }

  /**
   * Start playing a video file to the given drivers.
   * Groups drivers by matrix size and spawns one ffmpeg instance per resolution.
   */
  play(
    filePath: string,
    options: VideoPlayOptions,
    drivers: Driver[],
    broadcastStartStop: (payload: Record<string, unknown>) => void,
  ): void {
    if (!this.ffmpegPath) {
      log.error('Cannot play video: ffmpeg not found');
      return;
    }

    // Stop any current playback first
    if (this.playing) {
      this.stop(broadcastStartStop);
    }

    const resolvedPath = resolveVideoPath(filePath);

    // Group drivers by matrix dimensions
    const dimensionMap = new Map<string, DriverGroup>();

    for (const driver of drivers) {
      // Skip strip layouts — video only makes sense on 2D matrices
      if (driver.resolvedHardware?.layout === 'strip') {
        continue;
      }

      const dims = getDriverMatrixDimensions(driver);

      if (!dims) {
        log.warn(
          `Video: skipping driver ${driver.id} — no matrix dimensions`,
        );
        continue;
      }

      const key = `${dims.width}x${dims.height}`;
      let group = dimensionMap.get(key);

      if (!group) {
        group = {
          width: dims.width,
          height: dims.height,
          drivers: [],
          frameSize: dims.width * dims.height * 3,
          sequenceNumber: 0,
          framesSent: 0,
          framesDropped: 0,
        };
        dimensionMap.set(key, group);
      }
      group.drivers.push(driver);
    }

    if (dimensionMap.size === 0) {
      log.warn('No drivers with valid matrix dimensions for video playback');
      return;
    }

    this.groups = [...dimensionMap.values()];
    this.playing = true;

    // Send start command only to matrix drivers
    const matrixDriverIds = this.groups.flatMap((g) =>
      g.drivers.map((d) => d.id),
    );

    broadcastStartStop({
      effect: 'video',
      props: { action: 'start' },
      drivers: matrixDriverIds,
    });

    // Spawn ffmpeg per resolution group
    for (const group of this.groups) {
      this.spawnFfmpegForGroup(resolvedPath, options, group, broadcastStartStop);
    }
  }

  private spawnFfmpegForGroup(
    filePath: string,
    options: VideoPlayOptions,
    group: DriverGroup,
    broadcastStartStop: (payload: Record<string, unknown>) => void,
  ): void {
    const w = group.width;
    const h = group.height;
    const fit = options.fit ?? 'crop';

    // Build video filter chain based on fit mode
    let vf: string;

    if (fit === 'crop') {
      // Scale so smallest dimension fills the target, then center-crop the overflow
      vf = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
    } else {
      // Stretch to exact target dimensions (ignores aspect ratio)
      vf = `scale=${w}:${h}`;
    }

    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-re',
      '-i', filePath,
      '-an',                        // Skip audio decoding
      '-vf', vf,
      '-vsync', 'cfr',              // Constant frame rate output
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
    ];

    if (options.fps) {
      args.push('-r', String(options.fps));
    }

    args.push('pipe:1');

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ffmpeg = spawn(this.ffmpegPath!, args);
    group.ffmpeg = ffmpeg;

    const fps = options.fps ?? DEFAULT_FPS;
    const frameIntervalMs = 1000 / fps;

    const driverIps = group.drivers
      .map((d) => `${d.id}@${d.ip ?? 'no-ip'}`)
      .join(', ');
    log.info(
      `Video: spawned ffmpeg for ${group.width}x${group.height} ` +
        `(${group.drivers.length} driver(s), frameSize=${group.frameSize}, ` +
        `fps=${fps}, targets=[${driverIps}])`,
    );

    let frameBuffer = Buffer.alloc(0);

    // Extract complete frames from ffmpeg stdout into pendingFrame.
    // Only the latest frame is kept — older frames are dropped.
    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      frameBuffer = Buffer.concat([frameBuffer, chunk]);

      while (frameBuffer.length >= group.frameSize) {
        if (group.pendingFrame) {
          group.framesDropped++;
        }

        group.pendingFrame = Buffer.from(
          frameBuffer.subarray(0, group.frameSize),
        );
        frameBuffer = frameBuffer.subarray(group.frameSize);
      }
    });

    // Pace timer sends the latest frame at the target fps
    group.paceTimer = setInterval(() => {
      if (group.pendingFrame) {
        sendFrame(this.socket, group.pendingFrame, group);
        group.pendingFrame = undefined;
        group.framesSent++;
      }
    }, frameIntervalMs);

    // Status log once per second
    group.statusTimer = setInterval(() => {
      log.info(
        `Video: ${group.width}x${group.height} — ` +
          `sent=${group.framesSent}, dropped=${group.framesDropped}`,
      );
    }, 1000);

    ffmpeg.stderr.on('data', (data: Buffer) => {
      log.error(`ffmpeg stderr: ${data.toString().trim()}`);
    });

    ffmpeg.on('close', (code) => {
      log.info(
        `ffmpeg exited with code ${code} — ` +
          `total sent=${group.framesSent}, dropped=${group.framesDropped}`,
      );

      if (group.paceTimer) {
        clearInterval(group.paceTimer);
        group.paceTimer = undefined;
      }

      if (group.statusTimer) {
        clearInterval(group.statusTimer);
        group.statusTimer = undefined;
      }

      // Send any remaining frame before closing
      if (group.pendingFrame) {
        sendFrame(this.socket, group.pendingFrame, group);
        group.pendingFrame = undefined;
      }

      group.ffmpeg = undefined;

      // Check if all groups are done
      const allDone = this.groups.every((g) => !g.ffmpeg);

      if (allDone && this.playing) {
        if (options.loop) {
          // Restart all groups
          for (const g of this.groups) {
            this.spawnFfmpegForGroup(filePath, options, g, broadcastStartStop);
          }
        } else {
          this.playing = false;
          broadcastStartStop({
            effect: 'video',
            props: { action: 'stop' },
            drivers: this.groups.flatMap((g) =>
              g.drivers.map((d) => d.id),
            ),
          });
          this.groups = [];
        }
      }
    });

    ffmpeg.on('error', (err) => {
      log.error(`ffmpeg error: ${err.message}`);
      group.ffmpeg = undefined;
    });
  }

  /**
   * Stop video playback and kill all ffmpeg processes.
   */
  stop(
    broadcastStartStop: (payload: Record<string, unknown>) => void,
  ): void {
    if (!this.playing) {
      return;
    }

    this.playing = false;

    if (this.frameTimer) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }

    // Kill all ffmpeg processes, timers, and buffered frames
    for (const group of this.groups) {
      group.pendingFrame = undefined;

      if (group.paceTimer) {
        clearInterval(group.paceTimer);
      }

      if (group.statusTimer) {
        clearInterval(group.statusTimer);
      }

      if (group.ffmpeg) {
        group.ffmpeg.kill('SIGKILL');
      }
    }

    // Send stop command
    broadcastStartStop({
      effect: 'video',
      props: { action: 'stop' },
      drivers: this.groups.flatMap((g) => g.drivers.map((d) => d.id)),
    });

    this.groups = [];
  }

  /**
   * Close the UDP socket and clean up.
   */
  destroy(): void {
    this.playing = false;

    for (const group of this.groups) {
      if (group.paceTimer) {
        clearInterval(group.paceTimer);
      }

      if (group.statusTimer) {
        clearInterval(group.statusTimer);
      }

      if (group.ffmpeg) {
        group.ffmpeg.kill('SIGKILL');
      }
    }

    this.groups = [];
    this.socket.close();
  }
}
