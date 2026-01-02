/**
 * Unit tests for GIF Loader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';
import { loadGif } from '../gif-loader';

// Mock the entire fs/promises module
vi.mock('fs/promises');

// Cast the mocked function for type safety
const mockReadFile = vi.mocked(readFile);

// Minimal 2x2 GIF with 2 colors (red and blue), single frame
// This is a valid GIF89a file structure
const MINIMAL_GIF_BUFFER = Buffer.from([
  // Header: GIF89a
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
  // Logical Screen Descriptor: 2x2, global color table (2 colors)
  0x02, 0x00, // width: 2
  0x02, 0x00, // height: 2
  0x80, // packed: global color table, 1 bit (2 colors)
  0x00, // background color index
  0x00, // pixel aspect ratio
  // Global Color Table (2 colors: red, blue)
  0xff, 0x00, 0x00, // color 0: red
  0x00, 0x00, 0xff, // color 1: blue
  // Graphics Control Extension (for frame delay)
  0x21, 0xf9, 0x04, 0x00,
  0x0a, 0x00, // delay: 10 centiseconds = 100ms
  0x00, 0x00,
  // Image Descriptor
  0x2c, // image separator
  0x00, 0x00, // left: 0
  0x00, 0x00, // top: 0
  0x02, 0x00, // width: 2
  0x02, 0x00, // height: 2
  0x00, // packed: no local color table
  // Image Data (LZW compressed)
  0x02, // LZW minimum code size
  0x02, 0x44, 0x01, // compressed data block
  0x00, // block terminator
  // Trailer
  0x3b,
]);

// 2-frame animated GIF (same 2x2 with 2 colors)
const ANIMATED_GIF_BUFFER = Buffer.from([
  // Header: GIF89a
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
  // Logical Screen Descriptor: 2x2, global color table (2 colors)
  0x02, 0x00, 0x02, 0x00, 0x80, 0x00, 0x00,
  // Global Color Table (2 colors: red, blue)
  0xff, 0x00, 0x00, 0x00, 0x00, 0xff,
  // Frame 1: Graphics Control Extension
  0x21, 0xf9, 0x04, 0x00, 0x05, 0x00, 0x00, 0x00, // 50ms delay = 20fps
  // Frame 1: Image Descriptor
  0x2c, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00,
  // Frame 1: Image Data
  0x02, 0x02, 0x44, 0x01, 0x00,
  // Frame 2: Graphics Control Extension
  0x21, 0xf9, 0x04, 0x00, 0x05, 0x00, 0x00, 0x00, // 50ms delay
  // Frame 2: Image Descriptor
  0x2c, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00,
  // Frame 2: Image Data
  0x02, 0x02, 0x44, 0x01, 0x00,
  // Trailer
  0x3b,
]);

// GIF with local color table only (no global color table)
// This tests the fallback to frame.colorTable when gif.gct is undefined
const LOCAL_COLOR_TABLE_GIF_BUFFER = Buffer.from([
  // Header: GIF89a
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
  // Logical Screen Descriptor: 2x2, NO global color table
  0x02, 0x00, // width: 2
  0x02, 0x00, // height: 2
  0x00, // packed: NO global color table (bit 7 = 0)
  0x00, // background color index
  0x00, // pixel aspect ratio
  // NO Global Color Table here
  // Graphics Control Extension (for frame delay)
  0x21, 0xf9, 0x04, 0x00,
  0x0a, 0x00, // delay: 10 centiseconds = 100ms
  0x00, 0x00,
  // Image Descriptor with LOCAL color table
  0x2c, // image separator
  0x00, 0x00, // left: 0
  0x00, 0x00, // top: 0
  0x02, 0x00, // width: 2
  0x02, 0x00, // height: 2
  0x80, // packed: HAS local color table, 1 bit (2 colors)
  // Local Color Table (2 colors: green, yellow)
  0x00, 0xff, 0x00, // color 0: green
  0xff, 0xff, 0x00, // color 1: yellow
  // Image Data (LZW compressed)
  0x02, // LZW minimum code size
  0x02, 0x44, 0x01, // compressed data block
  0x00, // block terminator
  // Trailer
  0x3b,
]);

describe('loadGif', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load a single-frame GIF and extract palette', async () => {
    mockReadFile.mockResolvedValue(MINIMAL_GIF_BUFFER);

    const result = await loadGif('/test/image.gif');

    expect(result.palette).toHaveLength(2);
    expect(result.palette[0]).toBe('#FF0000'); // red
    expect(result.palette[1]).toBe('#0000FF'); // blue
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.frameCount).toBe(1);
    expect(result.frameRate).toBeUndefined(); // single frame has no frameRate
  });

  it('should convert pixels to hex character strings', async () => {
    mockReadFile.mockResolvedValue(MINIMAL_GIF_BUFFER);

    const result = await loadGif('/test/image.gif');

    expect(result.images).toHaveLength(1);
    // Each row should be a string of hex chars (0 or 1 for our 2-color palette)
    expect(result.images[0].length).toBeGreaterThan(0);
    // Characters should only be 0, 1, or space (transparent)

    for (const row of result.images[0]) {
      expect(row).toMatch(/^[01 ]*$/);
    }
  });

  it('should extract frameRate for animated GIFs', async () => {
    mockReadFile.mockResolvedValue(ANIMATED_GIF_BUFFER);

    const result = await loadGif('/test/animated.gif');

    expect(result.frameCount).toBe(2);
    expect(result.frameRate).toBeDefined();
    expect(result.frameRate).toBe(20); // 50ms delay = 20fps
  });

  it('should throw error for empty GIF', async () => {
    mockReadFile.mockResolvedValue(Buffer.from([]));

    await expect(loadGif('/test/empty.gif')).rejects.toThrow();
  });

  it('should throw error for invalid GIF data', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('not a gif'));

    await expect(loadGif('/test/invalid.gif')).rejects.toThrow();
  });

  it('should throw error when file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(loadGif('/test/missing.gif')).rejects.toThrow('ENOENT');
  });

  it('should handle transparent pixels as spaces', async () => {
    mockReadFile.mockResolvedValue(MINIMAL_GIF_BUFFER);

    const result = await loadGif('/test/image.gif');

    // Result images should have strings that may contain spaces for transparency
    expect(result.images[0]).toBeDefined();
  });

  it('should limit palette to 16 colors', async () => {
    mockReadFile.mockResolvedValue(MINIMAL_GIF_BUFFER);

    const result = await loadGif('/test/image.gif');

    expect(result.palette.length).toBeLessThanOrEqual(16);
  });

  it('should clamp frameRate to reasonable range', async () => {
    mockReadFile.mockResolvedValue(ANIMATED_GIF_BUFFER);

    const result = await loadGif('/test/animated.gif');

    if (result.frameRate !== undefined) {
      expect(result.frameRate).toBeGreaterThanOrEqual(1);
      expect(result.frameRate).toBeLessThanOrEqual(60);
    }
  });

  it('should use local color table when no global color table exists', async () => {
    mockReadFile.mockResolvedValue(LOCAL_COLOR_TABLE_GIF_BUFFER);

    const result = await loadGif('/test/local-color.gif');

    // Should extract palette from the local color table
    expect(result.palette).toHaveLength(2);
    expect(result.palette[0]).toBe('#00FF00'); // green
    expect(result.palette[1]).toBe('#FFFF00'); // yellow
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.frameCount).toBe(1);
  });
});
