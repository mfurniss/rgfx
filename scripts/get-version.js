#!/usr/bin/env node
/**
 * Get version from git using git describe
 *
 * On exact tag match: v1.0.0 → 1.0.0
 * Development builds: v0.0.2-104-g6976fba → 0.0.2-dev.104+6976fba
 * Dirty working tree: v0.0.2-104-g6976fba-dirty → 0.0.2-dev.104+6976fba-dirty
 * No tags: gabc1234 → 0.0.0-dev.0+abc1234
 */

const { execSync } = require('child_process');

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
  const match = describe.match(/^v?(\d+\.\d+\.\d+)-(\d+)-g([a-f0-9]+)(-dirty)?$/);
  if (match) {
    const [, version, commits, hash, dirty] = match;
    const suffix = dirty ? '-dirty' : '';
    console.log(`${version}-dev.${commits}+${hash}${suffix}`);
    process.exit(0);
  }

  // No tags exist - just a commit hash (possibly with -dirty)
  const hashMatch = describe.match(/^([a-f0-9]+)(-dirty)?$/);
  if (hashMatch) {
    const [, hash, dirty] = hashMatch;
    const suffix = dirty ? '-dirty' : '';
    console.log(`0.0.0-dev.0+${hash}${suffix}`);
    process.exit(0);
  }

  // Fallback
  console.log('0.0.0-dev.0+unknown');
} catch (error) {
  // Fallback if git is not available
  console.log('0.0.0-dev.0+unknown');
}
