import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('firmware versioning', () => {
  const projectRoot = path.join(__dirname, '../../..');

  it('should produce same version when ESP32 source is unchanged', () => {
    const version1 = execSync('node scripts/get-version.js', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
    const version2 = execSync('node scripts/get-version.js', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
    expect(version1).toBe(version2);
  });

  it('should use 8-char source hash for dev builds', () => {
    const version = execSync('node scripts/get-version.js', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
    // Format: X.Y.Z (release) or X.Y.Z-dev+XXXXXXXX (dev with 8 hex chars)
    const versionRegex = /^\d+\.\d+\.\d+(-dev\+[a-f0-9]{8})?$/;
    expect(versionRegex.test(version)).toBe(true);
  });

  it('should not include version.h in source hash (file is gitignored)', () => {
    // This test verifies that version.h doesn't contaminate the hash
    // by checking that the version script output doesn't change when run twice
    // (version.h is regenerated each time inject-version-driver.js runs)
    const version1 = execSync('node scripts/get-version.js', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();

    // Simulate what happens during build - inject version
    execSync('node scripts/inject-version-driver.js', {
      cwd: projectRoot,
      encoding: 'utf-8',
    });

    const version2 = execSync('node scripts/get-version.js', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();

    expect(version1).toBe(version2);
  });
});
