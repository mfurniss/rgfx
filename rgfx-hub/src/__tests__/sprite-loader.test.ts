/**
 * Unit tests for Sprite Loader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';
import { loadSprite } from '../sprite-loader';

vi.mock('fs/promises');

const mockReadFile = vi.mocked(readFile);

const VALID_SPRITE_JSON = JSON.stringify({
  images: [
    ['  12  ', ' 1221 ', '122221', '122221', ' 1221 ', '  12  '],
  ],
  palette: ['#000000', '#FF0000', '#DE9751', '#DEDEFF'],
  width: 16,
  height: 16,
  frameCount: 1,
});

const ANIMATED_SPRITE_JSON = JSON.stringify({
  images: [
    ['11', '11'],
    ['22', '22'],
  ],
  palette: ['#000000', '#FF0000', '#0000FF'],
  width: 8,
  height: 8,
  frameCount: 2,
  frameRate: 10,
});

describe('loadSprite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load a valid single-frame sprite JSON', async () => {
    mockReadFile.mockResolvedValue(VALID_SPRITE_JSON as never);

    const result = await loadSprite('/test/cherry.json');

    expect(result.palette).toEqual(['#000000', '#FF0000', '#DE9751', '#DEDEFF']);
    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
    expect(result.frameCount).toBe(1);
    expect(result.frameRate).toBeUndefined();
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toHaveLength(6);
    expect(result.images[0][0]).toBe('  12  ');
  });

  it('should load an animated sprite with frameRate', async () => {
    mockReadFile.mockResolvedValue(ANIMATED_SPRITE_JSON as never);

    const result = await loadSprite('/test/animated.json');

    expect(result.frameCount).toBe(2);
    expect(result.frameRate).toBe(10);
    expect(result.images).toHaveLength(2);
  });

  it('should not include frameRate when absent', async () => {
    mockReadFile.mockResolvedValue(VALID_SPRITE_JSON as never);

    const result = await loadSprite('/test/sprite.json');

    expect(result).not.toHaveProperty('frameRate');
  });

  it('should throw on invalid JSON', async () => {
    mockReadFile.mockResolvedValue('not json' as never);

    await expect(loadSprite('/test/bad.json')).rejects.toThrow();
  });

  it('should throw on missing images array', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ palette: ['#FF0000'], width: 8, height: 8, frameCount: 1 }) as never,
    );

    await expect(loadSprite('/test/no-images.json')).rejects.toThrow(
      'Invalid sprite file format',
    );
  });

  it('should load sprite without palette (color_map sprites use default PICO-8)', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ images: [['AA']], width: 8, height: 8, frameCount: 1 }) as never,
    );

    const result = await loadSprite('/test/no-palette.json');

    expect(result).not.toHaveProperty('palette');
    expect(result.images).toHaveLength(1);
  });

  it('should throw when file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(loadSprite('/test/missing.json')).rejects.toThrow('ENOENT');
  });
});
