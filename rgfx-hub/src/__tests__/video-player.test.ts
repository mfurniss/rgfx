import { describe, it, expect } from 'vitest';
import {
  resolveVideoPath,
  getDriverMatrixDimensions,
  buildVideoPacket,
} from '../video-player';
import type { Driver } from '../types';
import { createDriver } from '../types/driver';

// Helper to create a driver with hardware config
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
    expect(result).toContain('videos/intro.mp4');
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
    // 2x2 grid of 16x16 panels = 32x32
    const driver = makeDriver('test', 16, 16, 'matrix-br-v-snake', [
      ['0a', '1a'],
      ['2a', '3a'],
    ]);
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 32, height: 32 });
  });

  it('should handle 1x4 horizontal unified panels', () => {
    // 4 panels in a row: 8x8 each = 32x8
    const driver = makeDriver('test', 8, 8, 'matrix-br-v-snake', [
      ['0a', '1a', '2a', '3a'],
    ]);
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 32, height: 8 });
  });

  it('should swap dimensions for 270° rotated unified panels', () => {
    // 3 panels of 8x32 rotated 'd' (270°) in a row: each becomes 32x8, total 96x8
    const driver = makeDriver('test', 8, 32, 'matrix-br-v-snake', [
      ['2d', '1d', '0d'],
    ]);
    const dims = getDriverMatrixDimensions(driver);
    expect(dims).toEqual({ width: 96, height: 8 });
  });

  it('should swap dimensions for 90° rotated unified panels', () => {
    // 2 panels of 8x32 rotated 'b' (90°) vertically: each becomes 32x8, total 32x16
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

    // Header: magic, flags, seq(2), totalSize(2), offset(2)
    expect(packet[0]).toBe(0x56); // VIDEO_MAGIC
    expect(packet[1]).toBe(0x01); // VIDEO_FLAG_LAST_FRAGMENT
    expect(packet.readUInt16BE(2)).toBe(42); // sequence
    expect(packet.readUInt16BE(4)).toBe(768); // totalSize
    expect(packet.readUInt16BE(6)).toBe(0); // fragmentOffset
    // Payload follows header
    expect(packet[8]).toBe(0xff);
    expect(packet[9]).toBe(0x00);
    expect(packet[10]).toBe(0x88);
    expect(packet.length).toBe(11); // 8 header + 3 payload
  });

  it('should set flags correctly for non-last fragment', () => {
    const payload = Buffer.alloc(100);
    const packet = buildVideoPacket(payload, 0, 6144, 1464, false);

    expect(packet[1]).toBe(0x00); // No last-fragment flag
    expect(packet.readUInt16BE(6)).toBe(1464); // fragmentOffset
    expect(packet.readUInt16BE(4)).toBe(6144); // totalSize
  });

  it('should wrap sequence number at 16 bits', () => {
    const payload = Buffer.alloc(1);
    const packet = buildVideoPacket(payload, 0x1ffff, 1, 0, true);

    // 0x1FFFF & 0xFFFF = 0xFFFF
    expect(packet.readUInt16BE(2)).toBe(0xffff);
  });

  it('should produce correct packet size for full MTU payload', () => {
    const maxPayload = 1464; // VIDEO_MAX_PAYLOAD
    const payload = Buffer.alloc(maxPayload);
    const packet = buildVideoPacket(payload, 0, 6144, 0, false);

    expect(packet.length).toBe(1472); // 8 + 1464 = MTU limit
  });
});
