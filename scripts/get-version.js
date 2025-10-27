#!/usr/bin/env node
/**
 * Get version from git tag or return development version
 *
 * If on a tag: v1.0.0 → 1.0.0
 * If not on tag: 0.0.1-dev+abc1234 (base version + commit hash)
 */

const { execSync } = require('child_process');

try {
  // Try to get exact tag for current commit
  const tag = execSync('git describe --exact-match --tags HEAD 2>/dev/null', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();

  // Remove 'v' prefix if present
  const version = tag.replace(/^v/, '');
  console.log(version);
} catch (error) {
  // Not on a tag - generate development version
  try {
    const hash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8'
    }).trim();
    console.log(`0.0.1-dev+${hash}`);
  } catch (gitError) {
    // Fallback if git is not available
    console.log('0.0.1-dev+unknown');
  }
}
