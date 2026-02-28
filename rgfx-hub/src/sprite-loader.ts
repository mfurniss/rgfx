/**
 * Sprite Loader Utility
 *
 * Loads JSON sprite files extracted from ROM data by the MAME sprite-extract.lua module.
 * Returns the same GifBitmapResult format as gif-loader.ts for compatibility.
 */

import { readFile } from 'fs/promises';
import type { GifBitmapResult } from './types/transformer-types';

interface SpriteFileData {
  images: string[][];
  palette?: string[];
}

function isSpriteFileData(data: unknown): data is SpriteFileData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return Array.isArray(obj.images);
}

/**
 * Load a JSON sprite file and return it as bitmap effect format.
 * Dimensions and frame count are derived from the images array.
 */
export async function loadSprite(filePath: string): Promise<GifBitmapResult> {
  const json = await readFile(filePath, 'utf-8');
  const data: unknown = JSON.parse(json);

  if (!isSpriteFileData(data)) {
    throw new Error(`Invalid sprite file format: ${filePath}`);
  }

  const frameCount = data.images.length;
  const height = data.images[0]?.length ?? 0;
  const width = data.images.reduce(
    (max, frame) => Math.max(max, ...frame.map((row) => row.length)),
    0,
  );

  return {
    images: data.images,
    ...(data.palette != null && { palette: data.palette }),
    width,
    height,
    frameCount,
  };
}
