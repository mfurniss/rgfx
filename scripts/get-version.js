#!/usr/bin/env node
/**
 * Get version from git using git describe + content hash for dirty builds
 *
 * On exact tag match: v1.0.0 → 1.0.0
 * Development builds (clean): v0.0.2-104-g6976fba → 0.0.2-dev.104+6976fba
 * Development builds (dirty): v0.0.2-104-g6976fba-dirty → 0.0.2-dev.104+6976fba-dirty.a1b2c3d4
 * No tags (clean): gabc1234 → 0.0.0-dev.0+abc1234
 * No tags (dirty): gabc1234-dirty → 0.0.0-dev.0+abc1234-dirty.a1b2c3d4
 *
 * Content hash is computed from ESP32 source files + platformio.ini
 * This ensures same source = same version (reproducible builds)
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Compute a short hash of ESP32 source files and build config
 * Used for dirty builds to ensure same uncommitted changes = same version
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
  const describe = execSync('git describe --long --tags --dirty --always', {
    encoding: 'utf-8'
  }).trim();

  // Check if on exact tag (format: v1.0.0-0-ghash or just hash if no tags)
  const exactTagMatch = describe.match(/^v?(\d+\.\d+\.\d+)-0-g[a-f0-9]+$/);
  if (exactTagMatch) {
    console.log(exactTagMatch[1]);
    process.exit(0);
  }

  // Parse git describe output: v0.0.2-104-g6976fba or v0.0.2-104-g6976fba-dirty
  const match = describe.match(
    /^v?(\d+\.\d+\.\d+)-(\d+)-g([a-f0-9]+)(-dirty)?$/
  );
  if (match) {
    const [, version, commits, hash, dirty] = match;
    if (dirty) {
      const sourceHash = getSourceHash();
      console.log(`${version}-dev.${commits}+${hash}-dirty.${sourceHash}`);
    } else {
      console.log(`${version}-dev.${commits}+${hash}`);
    }
    process.exit(0);
  }

  // No tags exist - just a commit hash (possibly with -dirty)
  const hashMatch = describe.match(/^([a-f0-9]+)(-dirty)?$/);
  if (hashMatch) {
    const [, hash, dirty] = hashMatch;
    if (dirty) {
      const sourceHash = getSourceHash();
      console.log(`0.0.0-dev.0+${hash}-dirty.${sourceHash}`);
    } else {
      console.log(`0.0.0-dev.0+${hash}`);
    }
    process.exit(0);
  }

  // Fallback
  const sourceHash = getSourceHash();
  console.log(`0.0.0-dev.0+unknown-dirty.${sourceHash}`);
} catch {
  // Fallback if git is not available
  const sourceHash = getSourceHash();
  console.log(`0.0.0-dev.0+unknown-dirty.${sourceHash}`);
}
