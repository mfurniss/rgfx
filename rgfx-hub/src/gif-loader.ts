/**
 * GIF Loader Utility
 *
 * Loads animated GIFs and converts them to the bitmap effect format
 * used by the RGFX transformer system.
 */

import { readFile } from 'fs/promises';
import { parseGIF, decompressFrames } from 'gifuct-js';
import type { GifBitmapResult } from './types/transformer-types';

// Hex characters for palette indices 0-15
const HEX_CHARS = '0123456789ABCDEF';

/**
 * Convert RGB values to hex color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Load an animated GIF and convert it to bitmap effect format
 *
 * @param filePath - Absolute path to the GIF file
 * @returns Promise resolving to GifBitmapResult with images, palette, dimensions, and frame info
 */
export async function loadGif(filePath: string): Promise<GifBitmapResult> {
  // Read the GIF file
  const buffer = await readFile(filePath);

  // Convert Node Buffer to ArrayBuffer for gifuct-js
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  // Parse the GIF
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, false);

  if (frames.length === 0) {
    throw new Error(`No frames found in GIF: ${filePath}`);
  }

  // Get dimensions from logical screen descriptor
  const { width, height } = gif.lsd;

  // Build palette from global color table or first frame's local color table (first 16 colors)
  // GIF spec requires either global or local color table
  // Use lsd.gct.exists flag to check if global color table is present
  const colorTable = gif.lsd.gct.exists ? gif.gct : frames[0].colorTable;

  if (colorTable.length === 0) {
    throw new Error(`No color table found in GIF: ${filePath}`);
  }

  const palette: string[] = [];

  for (let i = 0; i < Math.min(16, colorTable.length); i++) {
    const [r, g, b] = colorTable[i];

    palette.push(rgbToHex(r, g, b));
  }

  // Convert each frame to string array format
  const images: string[][] = [];

  for (const frame of frames) {
    const frameStrings: string[] = [];
    const { pixels, dims, transparentIndex, colorTable } = frame;

    // Use frame's local color table (colorTable is always defined per gifuct-js types)
    const effectiveColorTable = colorTable;

    // Create a full-size canvas for this frame
    // Initialize with transparent (space) characters
    const canvas: string[][] = [];

    for (let y = 0; y < height; y++) {
      canvas.push(new Array<string>(width).fill(' '));
    }

    // Draw the frame's pixels onto the canvas at the correct position
    for (let i = 0; i < pixels.length; i++) {
      const pixelIndex = pixels[i];
      const x = dims.left + (i % dims.width);
      const y = dims.top + Math.floor(i / dims.width);

      // Skip if out of bounds
      if (x >= width || y >= height) {
        continue;
      }

      // Check for transparency (transparentIndex of -1 means no transparency)
      if (transparentIndex >= 0 && pixelIndex === transparentIndex) {
        canvas[y][x] = ' ';
        continue;
      }

      // Map pixel to palette index (modulo 16 if GIF has more colors)
      // Find the color in our palette, or use the raw index mod 16
      const color = effectiveColorTable[pixelIndex];
      const hexColor = rgbToHex(color[0], color[1], color[2]);
      const paletteIndex = palette.indexOf(hexColor);

      if (paletteIndex !== -1) {
        canvas[y][x] = HEX_CHARS[paletteIndex];
      } else {
        // Color not in first 16, use modulo
        canvas[y][x] = HEX_CHARS[pixelIndex % 16];
      }
    }

    // Convert canvas rows to strings, trimming trailing spaces
    for (const row of canvas) {
      frameStrings.push(row.join('').trimEnd());
    }

    // Trim trailing empty rows
    while (frameStrings.length > 0 && frameStrings[frameStrings.length - 1] === '') {
      frameStrings.pop();
    }

    images.push(frameStrings);
  }

  // Calculate frame rate from delay (delay is in milliseconds)
  // Use the first frame's delay as representative
  const result: GifBitmapResult = {
    images,
    palette,
    width,
    height,
    frameCount: frames.length,
  };

  // Only include frameRate for animated GIFs
  if (frames.length > 1) {
    const delayMs = frames[0].delay || 100; // Default to 100ms if not specified
    const fps = Math.round(1000 / delayMs);

    result.frameRate = Math.max(1, Math.min(fps, 60)); // Clamp to reasonable range
  }

  return result;
}
