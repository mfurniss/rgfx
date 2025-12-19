#!/usr/bin/env node
/**
 * Get version from git tags + ESP32 source content hash
 *
 * On exact tag match: v1.0.0 → 1.0.0
 * Development builds: v0.0.2-104-g6976fba → 0.0.2-dev.104+a1b2c3d4
 *
 * The content hash is computed from ESP32 source files + platformio.ini.
 * This ensures same ESP32 source = same version (reproducible builds).
 * Version only changes when ESP32 code actually changes.
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Compute a short hash of ESP32 source files and build config.
 * Same source files = same hash = same version.
 */
function getSourceHash() {
  const hash = crypto.createHash('sha256');
  const projectRoot = path.join(__dirname, '..');

  try {
    // Get list of tracked ESP32 source files + platformio.ini
    const trackedFiles = execSync(
      'git ls-files esp32/src esp32/include esp32/lib esp32/platformio.ini',
      { encoding: 'utf-8', cwd: projectRoot }
    )
      .trim()
      .split('\n')
      .filter(Boolean);

    // Also include any untracked files in those directories
    const untrackedFiles = execSync(
      'git ls-files --others --exclude-standard esp32/src esp32/include esp32/lib',
      { encoding: 'utf-8', cwd: projectRoot }
    )
      .trim()
      .split('\n')
      .filter(Boolean);

    const allFiles = [...new Set([...trackedFiles, ...untrackedFiles])].sort();

    for (const file of allFiles) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        hash.update(file + content);
      }
    }

    return hash.digest('hex').substring(0, 8);
  } catch {
    // Fallback if git commands fail
    return 'unknown';
  }
}

try {
  const describe = execSync('git describe --long --tags --always', {
    encoding: 'utf-8'
  }).trim();

  const sourceHash = getSourceHash();

  // Check if on exact tag (format: v1.0.0-0-ghash)
  const exactTagMatch = describe.match(/^v?(\d+\.\d+\.\d+)-0-g[a-f0-9]+$/);
  if (exactTagMatch) {
    console.log(exactTagMatch[1]);
    process.exit(0);
  }

  // Parse git describe output: v0.0.2-104-g6976fba
  const match = describe.match(/^v?(\d+\.\d+\.\d+)-(\d+)-g([a-f0-9]+)$/);
  if (match) {
    const [, version, commits] = match;
    console.log(`${version}-dev.${commits}+${sourceHash}`);
    process.exit(0);
  }

  // No tags exist - just a commit hash
  const hashMatch = describe.match(/^([a-f0-9]+)$/);
  if (hashMatch) {
    console.log(`0.0.0-dev.0+${sourceHash}`);
    process.exit(0);
  }

  // Fallback
  console.log(`0.0.0-dev.0+${sourceHash}`);
} catch {
  // Fallback if git is not available
  const sourceHash = getSourceHash();
  console.log(`0.0.0-dev.0+${sourceHash}`);
}
