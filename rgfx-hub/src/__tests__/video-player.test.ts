import { join } from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Driver } from '../types';
import { createDriver } from '../types/driver';

const {
  mockSocketSend,
  mockSocketClose,
  mockSocketOn,
  mockStdoutOn,
  mockStderrOn,
  mockProcessOn,
  mockProcessKill,
  mockSpawn,
  mockExecFile,
} = vi.hoisted(() => {
  const mockStdoutOn = vi.fn();
  const mockStderrOn = vi.fn();
  const mockProcessOn = vi.fn();
  const mockProcessKill = vi.fn();

  return {
    mockSocketSend: vi.fn((
      _buf: Buffer, _port: number, _addr: string,
      cb?: (err: Error | null) => void,
    ) => {
      if (cb) {
        cb(null);
      }
    }),
    mockSocketClose: vi.fn(),
    mockSocketOn: vi.fn(),
    mockStdoutOn,
    mockStderrOn,
    mockProcessOn,
    mockProcessKill,
    mockSpawn: vi.fn(() => ({
      stdout: { on: mockStdoutOn },
      stderr: { on: mockStderrOn },
      on: mockProcessOn,
      kill: mockProcessKill,
    })),
    mockExecFile: vi.fn((_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
      cb(null); // ffmpeg found by default
    }),
  };
});

vi.mock('dgram', () => ({
  default: {
    createSocket: vi.fn(() => ({
      send: mockSocketSend,
      close: mockSocketClose,
      on: mockSocketOn,
    })),
  },
}));

vi.mock('child_process', () => ({
  default: { spawn: mockSpawn, execFile: mockExecFile },
  spawn: mockSpawn,
  execFile: mockExecFile,
}));

import {
  resolveVideoPath,
  getDriverMatrixDimensions,
  buildVideoPacket,
  VideoPlayer,
} from '../video-player';

function makeDriver(
  id: string,
  width: number,
  height: number,
  layout: 'strip' | 'matrix-br-v-snake' = 'matrix-br-v-snake',
  unified?: string[][] | null,
): Driver {
  return createDriver({
    id,
    ip: '192.168.1.100',
    state: 'connected',
    lastSeen: Date.now(),
    failedHeartbeats: 0,
    disabled: false,
    resolvedHardware: {
      sku: null,
      layout,
      count: layout === 'strip' ? width : width * height,
      width: layout === 'strip' ? undefined : width,
      height: layout === 'strip' ? undefined : height,
    },
    ledConfig: unified
      ? {
        hardwareRef: 'test',
        pin: 0,
        unified,
        gamma: { r: 2.8, g: 2.8, b: 2.8 },
        floor: { r: 0, g: 0, b: 0 },
      }
      : {
        hardwareRef: 'test',
        pin: 0,
        gamma: { r: 2.8, g: 2.8, b: 2.8 },
        floor: { r: 0, g: 0, b: 0 },
      },
  });
}

describe('resolveVideoPath', () => {
  it('should pass through absolute paths', () => {
    expect(resolveVideoPath('/Users/test/video.mp4')).toBe(
      '/Users/test/video.mp4',
    );
  });

  it('should resolve relative paths against CONFIG_DIRECTORY', () => {
    const result = resolveVideoPath('videos/intro.mp4');
    expect(result).toContain('.rgfx');
    expect(result).toContain(join('videos', 'intro.mp4'));
  });
});

describe('getDriverMatrixDimensions', () => {
  it('should return dimensions for a simple matrix', () => {
    const driver = makeDriver('test', 64, 32);
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 64, height: 32 });
  });

  it('should return dimensions for a strip (height=1)', () => {
    const driver = makeDriver('test', 60, 1, 'strip');
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 60, height: 1 });
  });

  it('should scale dimensions for unified panels', () => {
    const driver = makeDriver('test', 16, 16, 'matrix-br-v-snake', [
      ['0a', '1a'],
      ['2a', '3a'],
    ]);
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 32, height: 32 });
  });

  it('should handle 1x4 horizontal unified panels', () => {
    const driver = makeDriver('test', 8, 8, 'matrix-br-v-snake', [
      ['0a', '1a', '2a', '3a'],
    ]);
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 32, height: 8 });
  });

  it('should swap dimensions for 270° rotated unified panels', () => {
    const driver = makeDriver('test', 8, 32, 'matrix-br-v-snake', [
      ['2d', '1d', '0d'],
    ]);
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 96, height: 8 });
  });

  it('should swap dimensions for 90° rotated unified panels', () => {
    const driver = makeDriver('test', 8, 32, 'matrix-br-v-snake', [
      ['1b'],
      ['0d'],
    ]);
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 32, height: 16 });
  });

  it('should handle single panel with 90° rotation', () => {
    const driver = makeDriver('test', 8, 32, 'matrix-br-v-snake');
    driver.ledConfig = {
      ...driver.ledConfig!,
      rotation: '90',
    };
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 32, height: 8 });
  });

  it('should return null for driver without hardware', () => {
    const driver = createDriver({
      id: 'test',
      state: 'connected',
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      disabled: false,
    });
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toBeNull();
  });
});

describe('buildVideoPacket', () => {
  it('should build a packet with correct header', () => {
    const payload = Buffer.from([0xff, 0x00, 0x88]);
    const packet = buildVideoPacket(payload, 42, 768, 0, true);

    expect(packet[0]).toBe(0x56);
    expect(packet[1]).toBe(0x01);
    expect(packet.readUInt16BE(2)).toBe(42);
    expect(packet.readUInt16BE(4)).toBe(768);
    expect(packet.readUInt16BE(6)).toBe(0);
    expect(packet[8]).toBe(0xff);
    expect(packet[9]).toBe(0x00);
    expect(packet[10]).toBe(0x88);
    expect(packet.length).toBe(11);
  });

  it('should set flags correctly for non-last fragment', () => {
    const payload = Buffer.alloc(100);
    const packet = buildVideoPacket(payload, 0, 6144, 1464, false);

    expect(packet[1]).toBe(0x00);
    expect(packet.readUInt16BE(6)).toBe(1464);
    expect(packet.readUInt16BE(4)).toBe(6144);
  });

  it('should wrap sequence number at 16 bits', () => {
    const payload = Buffer.alloc(1);
    const packet = buildVideoPacket(payload, 0x1ffff, 1, 0, true);

    expect(packet.readUInt16BE(2)).toBe(0xffff);
  });

  it('should produce correct packet size for full MTU payload', () => {
    const maxPayload = 1464;
    const payload = Buffer.alloc(maxPayload);
    const packet = buildVideoPacket(payload, 0, 6144, 0, false);

    expect(packet.length).toBe(1472);
  });
});

describe('VideoPlayer', () => {
  let player: VideoPlayer;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset ffmpeg to "available" for each test
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
        cb(null);
      },
    );
    player = new VideoPlayer();
  });

  afterEach(() => {
    player.destroy();
  });

  it('should detect ffmpeg during init', async () => {
    await player.init();
    expect(player.isFfmpegAvailable()).toBe(true);
  });

  it('should report ffmpeg unavailable when detection fails', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
        cb(new Error('not found'));
      },
    );

    player = new VideoPlayer();
    await player.init();
    expect(player.isFfmpegAvailable()).toBe(false);
  });

  it('should report not playing initially', () => {
    expect(player.isPlaying()).toBe(false);
  });

  it('should not play when ffmpeg is not available', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
        cb(new Error('not found'));
      },
    );

    player = new VideoPlayer();
    await player.init();

    const broadcast = vi.fn();
    player.play('/test.mp4', {}, [makeDriver('d1', 16, 16)], broadcast);

    expect(player.isPlaying()).toBe(false);
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should skip strip-layout drivers', async () => {
    await player.init();

    const broadcast = vi.fn();
    player.play('/test.mp4', {}, [makeDriver('s1', 60, 1, 'strip')], broadcast);

    expect(player.isPlaying()).toBe(false);
  });

  it('should skip drivers without resolved hardware', async () => {
    await player.init();

    const broadcast = vi.fn();
    const driver = createDriver({
      id: 'no-hw',
      state: 'connected',
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      disabled: false,
    });
    player.play('/test.mp4', {}, [driver], broadcast);

    expect(player.isPlaying()).toBe(false);
  });

  it('should group drivers by dimensions and broadcast start', async () => {
    await player.init();

    const broadcast = vi.fn();
    const drivers = [makeDriver('m1', 16, 16), makeDriver('m2', 16, 16)];

    player.play('/test.mp4', { fps: 30, fit: 'crop' }, drivers, broadcast);

    expect(player.isPlaying()).toBe(true);
    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        effect: 'video',
        props: { action: 'start' },
        drivers: ['m1', 'm2'],
      }),
    );
    expect(mockSpawn).toHaveBeenCalled();
  });

  it('should spawn separate ffmpeg for different dimensions', async () => {
    await player.init();

    const drivers = [makeDriver('m1', 16, 16), makeDriver('m2', 32, 8)];
    player.play('/test.mp4', {}, drivers, vi.fn());

    expect(mockSpawn).toHaveBeenCalledTimes(2);
  });

  it('should stop playback and kill ffmpeg', async () => {
    await player.init();

    const broadcast = vi.fn();
    player.play('/test.mp4', {}, [makeDriver('m1', 16, 16)], broadcast);
    expect(player.isPlaying()).toBe(true);

    player.stop(broadcast);
    expect(player.isPlaying()).toBe(false);
    expect(mockProcessKill).toHaveBeenCalledWith('SIGKILL');
    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        effect: 'video',
        props: { action: 'stop' },
      }),
    );
  });

  it('should be a no-op when stopping without playing', () => {
    const broadcast = vi.fn();
    player.stop(broadcast);
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should clean up on destroy', async () => {
    await player.init();

    player.play('/test.mp4', {}, [makeDriver('m1', 16, 16)], vi.fn());
    player.destroy();

    expect(player.isPlaying()).toBe(false);
    expect(mockSocketClose).toHaveBeenCalled();
    expect(mockProcessKill).toHaveBeenCalledWith('SIGKILL');

    // Prevent afterEach from double-destroying
    player = new VideoPlayer();
  });

  it('should stop current playback before starting new', async () => {
    await player.init();

    const broadcast = vi.fn();
    const drivers = [makeDriver('m1', 16, 16)];

    player.play('/test.mp4', {}, drivers, broadcast);
    player.play('/test2.mp4', {}, drivers, broadcast);

    expect(player.isPlaying()).toBe(true);
    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ props: { action: 'stop' } }),
    );
  });

  it('should use stretch filter when fit is stretch', async () => {
    await player.init();

    player.play('/test.mp4', { fit: 'stretch' }, [makeDriver('m1', 32, 8)], vi.fn());

    const spawnArgs = (mockSpawn.mock.calls[0] as unknown[])[1] as string[];
    const vfIndex = spawnArgs.indexOf('-vf');
    expect(spawnArgs[vfIndex + 1]).toBe('scale=32:8');
  });

  it('should use crop filter by default', async () => {
    await player.init();

    player.play('/test.mp4', {}, [makeDriver('m1', 32, 8)], vi.fn());

    const spawnArgs = (mockSpawn.mock.calls[0] as unknown[])[1] as string[];
    const vfIndex = spawnArgs.indexOf('-vf');
    expect(spawnArgs[vfIndex + 1]).toContain('crop=32:8');
  });

  it('should include fps flag when specified', async () => {
    await player.init();

    player.play('/test.mp4', { fps: 24 }, [makeDriver('m1', 16, 16)], vi.fn());

    const spawnArgs = (mockSpawn.mock.calls[0] as unknown[])[1] as string[];
    const rIndex = spawnArgs.indexOf('-r');
    expect(rIndex).toBeGreaterThan(-1);
    expect(spawnArgs[rIndex + 1]).toBe('24');
  });

  it('should send frames when stdout data arrives', async () => {
    await player.init();

    player.play('/test.mp4', {}, [makeDriver('m1', 2, 2)], vi.fn());

    const dataHandler = mockStdoutOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'data',
    )?.[1];

    expect(dataHandler).toBeDefined();

    // 2x2 RGB24 = 12 bytes per frame
    dataHandler(Buffer.alloc(12, 0xff));

    expect(mockSocketSend).toHaveBeenCalled();
  });

  it('should handle ffmpeg close event and broadcast stop', async () => {
    await player.init();

    const broadcast = vi.fn();
    player.play('/test.mp4', {}, [makeDriver('m1', 16, 16)], broadcast);

    const closeHandler = mockProcessOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'close',
    )?.[1];

    expect(closeHandler).toBeDefined();
    closeHandler(0);

    expect(player.isPlaying()).toBe(false);
    expect(broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ props: { action: 'stop' } }),
    );
  });

  it('should handle ffmpeg error event without throwing', async () => {
    await player.init();

    player.play('/test.mp4', {}, [makeDriver('m1', 16, 16)], vi.fn());

    const errorHandler = mockProcessOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'error',
    )?.[1];

    expect(errorHandler).toBeDefined();
    expect(() => errorHandler(new Error('spawn failed'))).not.toThrow();
  });

  it('should handle ffmpeg stderr output without throwing', async () => {
    await player.init();

    player.play('/test.mp4', {}, [makeDriver('m1', 16, 16)], vi.fn());

    const stderrHandler = mockStderrOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'data',
    )?.[1];

    expect(stderrHandler).toBeDefined();
    expect(() => stderrHandler(Buffer.from('error output'))).not.toThrow();
  });

  it('should loop when loop option is set and ffmpeg exits', async () => {
    await player.init();

    const broadcast = vi.fn();
    player.play('/test.mp4', { loop: true }, [makeDriver('m1', 16, 16)], broadcast);

    const closeHandler = mockProcessOn.mock.calls.find(
      (c: unknown[]) => c[0] === 'close',
    )?.[1];

    closeHandler(0);

    // Should restart — spawn called twice (original + restart)
    expect(mockSpawn).toHaveBeenCalledTimes(2);
    expect(player.isPlaying()).toBe(true);
  });
});
