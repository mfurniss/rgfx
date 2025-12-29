#!/usr/bin/env node
/**
 * Convert GIMP C header image export to RGFX sprite preset format
 * Usage: node gimp-header-to-sprite.mjs < input.h
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
  // Weighted Euclidean distance (human eye is more sensitive to green)
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function findClosestPaletteColor(r, g, b) {
  // Check for transparency (magenta or very low alpha indicator)
  if (r === 0 && g === 0 && b === 0) {
    // Could be black or transparent - check context
  }
  
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

function decodeGimpHeader(input) {
  // Extract dimensions
  const widthMatch = input.match(/width\s*=\s*(\d+)/);
  const heightMatch = input.match(/height\s*=\s*(\d+)/);
  
  if (!widthMatch || !heightMatch) {
    throw new Error('Could not find width/height in header');
  }
  
  const width = parseInt(widthMatch[1]);
  const height = parseInt(heightMatch[1]);
  
  // Extract the data string (everything between quotes, concatenated)
  const dataMatches = input.match(/"([^"]+)"/g);
  if (!dataMatches) {
    throw new Error('Could not find image data');
  }
  
  const data = dataMatches.map(s => s.slice(1, -1)).join('');
  
  // Decode pixels - each pixel is 4 chars encoding RGB
  const pixels = [];
  let pos = 0;
  
  for (let i = 0; i < width * height; i++) {
    const c0 = data.charCodeAt(pos) - 33;
    const c1 = data.charCodeAt(pos + 1) - 33;
    const c2 = data.charCodeAt(pos + 2) - 33;
    const c3 = data.charCodeAt(pos + 3) - 33;
    
    const r = (c0 << 2) | (c1 >> 4);
    const g = ((c1 & 0xF) << 4) | (c2 >> 2);
    const b = ((c2 & 0x3) << 6) | c3;
    
    pixels.push({ r, g, b });
    pos += 4;
  }
  
  return { width, height, pixels };
}

function pixelsToSprite(width, height, pixels, transparentColor = null) {
  const rows = [];
  
  // Find the background/transparent color if not specified
  // Usually it's the color in the corners
  if (!transparentColor) {
    const corners = [
      pixels[0],
      pixels[width - 1],
      pixels[(height - 1) * width],
      pixels[height * width - 1]
    ];
    // Use most common corner color as transparent
    const colorCounts = new Map();
    for (const c of corners) {
      const key = `${c.r},${c.g},${c.b}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    }
    let maxCount = 0;
    let bgKey = null;
    for (const [key, count] of colorCounts) {
      if (count > maxCount) {
        maxCount = count;
        bgKey = key;
      }
    }
    if (bgKey && maxCount >= 2) {
      const [r, g, b] = bgKey.split(',').map(Number);
      transparentColor = { r, g, b };
    }
  }
  
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const pixel = pixels[y * width + x];
      
      // Check if this is the transparent color
      if (transparentColor && 
          pixel.r === transparentColor.r && 
          pixel.g === transparentColor.g && 
          pixel.b === transparentColor.b) {
        row += '.';
      } else {
        const match = findClosestPaletteColor(pixel.r, pixel.g, pixel.b);
        row += match.name;
      }
    }
    rows.push(row);
  }
  
  return rows;
}

// Main
const input = readFileSync('/dev/stdin', 'utf8');
const { width, height, pixels } = decodeGimpHeader(input);

console.error(`Decoded ${width}x${height} image`);

// Show unique colors found
const uniqueColors = new Map();
for (const p of pixels) {
  const key = `${p.r},${p.g},${p.b}`;
  if (!uniqueColors.has(key)) {
    const match = findClosestPaletteColor(p.r, p.g, p.b);
    uniqueColors.set(key, { ...p, match });
  }
}

console.error('\nColors found:');
for (const [key, val] of uniqueColors) {
  console.error(`  RGB(${val.r}, ${val.g}, ${val.b}) -> ${val.match.name} (${val.match.hex})`);
}

const sprite = pixelsToSprite(width, height, pixels);

console.error('\nSprite output:');
console.log('image: [');
for (const row of sprite) {
  console.log(`  '${row}',`);
}
console.log('],');
