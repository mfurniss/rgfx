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
  width: number;
  height: number;
  frameCount: number;
  frameRate?: number;
}

function isSpriteFileData(data: unknown): data is SpriteFileData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.images);
}

/**
 * Load a JSON sprite file and return it as bitmap effect format
 *
 * @param filePath - Absolute path to the JSON sprite file
 * @returns Promise resolving to GifBitmapResult with images, palette, dimensions, and frame info
 */
export async function loadSprite(filePath: string): Promise<GifBitmapResult> {
  const json = await readFile(filePath, 'utf-8');
  const data: unknown = JSON.parse(json);

  if (!isSpriteFileData(data)) {
    throw new Error(`Invalid sprite file format: ${filePath}`);
  }

  return {
    images: data.images,
    ...(data.palette != null && { palette: data.palette }),
    width: data.width,
    height: data.height,
    frameCount: data.frameCount,
    ...(data.frameRate != null && { frameRate: data.frameRate }),
  };
}
