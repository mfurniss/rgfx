#!/usr/bin/env node
/**
 * Generate version.json for the firmware directory
 * Reads version from esp32/src/version.h and writes to rgfx-hub/public/esp32/firmware/version.json
 */

const fs = require('fs');
const path = require('path');

const versionHeaderPath = path.join(__dirname, '../esp32/src/version.h');
const outputPath = path.join(__dirname, '../rgfx-hub/public/esp32/firmware/version.json');

try {
  const versionHeader = fs.readFileSync(versionHeaderPath, 'utf-8');

  // Extract RGFX_VERSION from version.h
  const match = versionHeader.match(/#define RGFX_VERSION "([^"]+)"/);
  if (!match) {
    throw new Error('Could not find RGFX_VERSION in version.h');
  }

  const version = match[1];

  // Write version.json
  const versionJson = {
    version,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outputPath, JSON.stringify(versionJson, null, 2) + '\n');
  console.log(`Generated ${outputPath} with version ${version}`);
} catch (error) {
  console.error('Error generating firmware version:', error.message);
  process.exit(1);
}
