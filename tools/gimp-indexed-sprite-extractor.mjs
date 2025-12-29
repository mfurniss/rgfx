#!/usr/bin/env node
/**
 * Extract 16x16 sprites from a GIMP indexed sprite sheet
 * Usage: node gimp-indexed-sprite-extractor.mjs < input.h
 */

import { readFileSync } from 'fs';

// PICO-8 palette for color matching
const PICO8_PALETTE = [
  { hex: '#000000', name: '0', r: 0, g: 0, b: 0 },           // Black
  { hex: '#1D2B53', name: '1', r: 29, g: 43, b: 83 },        // Dark Blue
  { hex: '#7E2553', name: '2', r: 126, g: 37, b: 83 },       // Dark Purple
  { hex: '#008751', name: '3', r: 0, g: 135, b: 81 },        // Dark Green
  { hex: '#AB5236', name: '4', r: 171, g: 82, b: 54 },       // Brown
  { hex: '#5F574F', name: '5', r: 95, g: 87, b: 79 },        // Dark Gray
  { hex: '#C2C3C7', name: '6', r: 194, g: 195, b: 199 },     // Light Gray
  { hex: '#FFF1E8', name: '7', r: 255, g: 241, b: 232 },     // White
  { hex: '#FF004D', name: '8', r: 255, g: 0, b: 77 },        // Red
  { hex: '#FFA300', name: '9', r: 255, g: 163, b: 0 },       // Orange
  { hex: '#FFEC27', name: 'A', r: 255, g: 236, b: 39 },      // Yellow
  { hex: '#00E436', name: 'B', r: 0, g: 228, b: 54 },        // Green
  { hex: '#29ADFF', name: 'C', r: 41, g: 173, b: 255 },      // Blue
  { hex: '#83769C', name: 'D', r: 131, g: 118, b: 156 },     // Lavender
  { hex: '#FF77A8', name: 'E', r: 255, g: 119, b: 168 },     // Pink
  { hex: '#FFCCAA', name: 'F', r: 255, g: 204, b: 170 },     // Peach
];

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function findClosestPaletteColor(r, g, b) {
  let bestMatch = PICO8_PALETTE[0];
  let bestDistance = Infinity;
  
  for (const color of PICO8_PALETTE) {
    const dist = colorDistance(r, g, b, color.r, color.g, color.b);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = color;
    }
  }
  
  return bestMatch;
}

function parseIndexedGimpHeader(input) {
  // Extract dimensions
  const widthMatch = input.match(/width\s*=\s*(\d+)/);
  const heightMatch = input.match(/height\s*=\s*(\d+)/);
  
  if (!widthMatch || !heightMatch) {
    throw new Error('Could not find width/height in header');
  }
  
  const width = parseInt(widthMatch[1]);
  const height = parseInt(heightMatch[1]);
  
  // Parse the colormap
  const cmapMatch = input.match(/header_data_cmap\[256\]\[3\]\s*=\s*\{([^;]+)\}/s);
  if (!cmapMatch) {
    throw new Error('Could not find colormap');
  }
  
  const cmap = [];
  const cmapEntries = cmapMatch[1].matchAll(/\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\}/g);
  for (const entry of cmapEntries) {
    cmap.push({
      r: parseInt(entry[1]),
      g: parseInt(entry[2]),
      b: parseInt(entry[3])
    });
  }
  
  // Find the data section - it's a numeric array
  const dataMatch = input.match(/header_data\[\]\s*=\s*\{([^}]+)\}/s);
  if (!dataMatch) {
    throw new Error('Could not find image data');
  }
  
  // Parse numeric values
  const dataStr = dataMatch[1];
  const bytes = dataStr.match(/\d+/g).map(Number);
  
  // Convert indices to RGB
  const pixels = [];
  for (let i = 0; i < bytes.length && i < width * height; i++) {
    const idx = bytes[i];
    if (idx < cmap.length) {
      pixels.push(cmap[idx]);
    } else {
      pixels.push({ r: 0, g: 0, b: 0 });
    }
  }
  
  return { width, height, pixels, cmap };
}

function extractSprite(pixels, sheetWidth, sheetHeight, spriteX, spriteY, spriteW, spriteH) {
  const sprite = [];
  for (let y = 0; y < spriteH; y++) {
    const row = [];
    for (let x = 0; x < spriteW; x++) {
      const px = spriteX + x;
      const py = spriteY + y;
      if (px < sheetWidth && py < sheetHeight) {
        row.push(pixels[py * sheetWidth + px]);
      } else {
        row.push({ r: 0, g: 0, b: 0 });
      }
    }
    sprite.push(row);
  }
  return sprite;
}

function spriteToPreset(sprite, bgColor = null) {
  // Detect background color from corners if not specified
  if (!bgColor) {
    const corners = [
      sprite[0][0],
      sprite[0][sprite[0].length - 1],
      sprite[sprite.length - 1][0],
      sprite[sprite.length - 1][sprite[0].length - 1]
    ];
    const colorCounts = new Map();
    for (const c of corners) {
      const key = `${c.r},${c.g},${c.b}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
    let maxCount = 0;
    for (const [key, count] of colorCounts) {
      if (count > maxCount) {
        maxCount = count;
        const [r, g, b] = key.split(',').map(Number);
        bgColor = { r, g, b };
      }
    }
  }
  
  const rows = [];
  for (const row of sprite) {
    let line = '';
    for (const pixel of row) {
      if (bgColor && pixel.r === bgColor.r && pixel.g === bgColor.g && pixel.b === bgColor.b) {
        line += '.';
      } else {
        const match = findClosestPaletteColor(pixel.r, pixel.g, pixel.b);
        line += match.name;
      }
    }
    rows.push(line);
  }
  return rows;
}

function spriteHasContent(rows) {
  for (const row of rows) {
    if (row.replace(/\./g, '').length > 0) {
      return true;
    }
  }
  return false;
}

// Main
const input = readFileSync('/dev/stdin', 'utf8');
const { width, height, pixels, cmap } = parseIndexedGimpHeader(input);

console.error(`Decoded ${width}x${height} indexed image with ${cmap.length} colors`);

// The background color in BB sprite sheets is typically the purple/blue
// Let's detect it from the image edges
const bgColor = pixels[0]; // Top-left corner

const spriteSize = 16;
const spritesX = Math.floor(width / spriteSize);
const spritesY = Math.floor(height / spriteSize);

console.error(`Grid: ${spritesX}x${spritesY} = ${spritesX * spritesY} potential sprites`);
console.error(`Background color: RGB(${bgColor.r}, ${bgColor.g}, ${bgColor.b})\n`);

let spriteCount = 0;
const allSprites = [];

for (let sy = 0; sy < spritesY; sy++) {
  for (let sx = 0; sx < spritesX; sx++) {
    const sprite = extractSprite(pixels, width, height, sx * spriteSize, sy * spriteSize, spriteSize, spriteSize);
    const rows = spriteToPreset(sprite, bgColor);
    
    if (spriteHasContent(rows)) {
      spriteCount++;
      allSprites.push({
        x: sx,
        y: sy,
        rows
      });
    }
  }
}

console.error(`Found ${spriteCount} non-empty sprites\n`);

// Output first 50 sprites as examples
console.log('// Extracted sprites from Bubble Bobble sprite sheet');
console.log('// Format: { name, image[] }');
console.log('');

for (let i = 0; i < Math.min(50, allSprites.length); i++) {
  const s = allSprites[i];
  console.log(`// Sprite at grid position (${s.x}, ${s.y})`);
  console.log('{');
  console.log(`  name: 'BB Sprite ${i + 1}',`);
  console.log('  image: [');
  for (const row of s.rows) {
    console.log(`    '${row}',`);
  }
  console.log('  ],');
  console.log('},');
  console.log('');
}

console.error(`\nOutput first ${Math.min(50, allSprites.length)} sprites. Total available: ${allSprites.length}`);
