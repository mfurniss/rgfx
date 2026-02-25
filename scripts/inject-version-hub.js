#!/usr/bin/env node
/**
 * Inject version into Hub package.json
 *
 * Reads version from get-version.js and updates rgfx-hub/package.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Accept explicit version from CLI arg, or derive from git tag
const version = process.argv[2] || execSync('node scripts/get-version.js', {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf-8'
}).trim();

// Update package.json
const pkgPath = path.join(__dirname, '../rgfx-hub/package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

console.log(`✓ Hub version updated to ${version}`);
