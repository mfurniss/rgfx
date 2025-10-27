#!/usr/bin/env node
/**
 * Generate ESP32 version.h header file
 *
 * Reads version from get-version.js and generates esp32/src/version.h
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get version from get-version.js
const version = execSync('node scripts/get-version.js', {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf-8'
}).trim();

// Parse version into components
const versionMatch = version.match(/^(\d+)\.(\d+)\.(\d+)/);
const major = versionMatch ? versionMatch[1] : '0';
const minor = versionMatch ? versionMatch[2] : '0';
const patch = versionMatch ? versionMatch[3] : '0';

// Generate C++ header content
const header = `/* Auto-generated - DO NOT EDIT */
#ifndef VERSION_H
#define VERSION_H

#define RGFX_VERSION "${version}"
#define RGFX_VERSION_MAJOR ${major}
#define RGFX_VERSION_MINOR ${minor}
#define RGFX_VERSION_PATCH ${patch}

#endif
`;

// Write header file
const headerPath = path.join(__dirname, '../esp32/src/version.h');
fs.writeFileSync(headerPath, header, 'utf-8');

console.log(`✓ Driver version updated to ${version}`);
