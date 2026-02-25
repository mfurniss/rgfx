#!/usr/bin/env node
/**
 * RGFX release workflow: validate, tag, push. GitHub Actions handles the rest.
 *
 * Usage:
 *   npm run release -- v0.7.0     # Run quality checks, create tag, push
 *
 * What it does:
 *   1. Validates version matches rgfx-hub/package.json (run prepare-release first)
 *   2. Runs quality checks locally (fast-fail before pushing)
 *   3. Creates git tag and pushes to origin
 *   4. GitHub Actions builds installers (macOS + Windows) and creates the release
 *
 * Prerequisites:
 *   - Run prepare-release first: npm run prepare-release -- v0.7.0
 *   - gh CLI authenticated (gh auth login)
 *   - Working tree must be clean
 *   - Must be on main branch
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const HUB_DIR = path.join(ROOT_DIR, 'rgfx-hub');

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, {
    cwd: opts.cwd || ROOT_DIR,
    stdio: 'inherit',
    encoding: 'utf-8',
    ...opts,
  });
}

function runCapture(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: opts.cwd || ROOT_DIR,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

function fail(msg) {
  console.error(`\nError: ${msg}`);
  process.exit(1);
}

function tagExistsLocally(tagName) {
  try {
    runCapture(`git rev-parse --verify refs/tags/${tagName}`);
    return true;
  } catch {
    return false;
  }
}

function tagExistsOnRemote(tagName) {
  try {
    const result = runCapture(`git ls-remote --tags origin refs/tags/${tagName}`);
    return result.length > 0;
  } catch {
    return false;
  }
}

// --- Main ---
const tag = process.argv[2];
if (!tag) fail('Usage: npm run release -- v0.7.0');
if (!/^v\d+\.\d+\.\d+$/.test(tag)) fail(`Tag '${tag}' doesn't match vMAJOR.MINOR.PATCH format`);

const version = tag.slice(1);
console.log(`\nRGFX Release — ${version}\n`);

// --- Pre-flight checks ---
const branch = runCapture('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  fail(`Must be on main branch to release. Currently on '${branch}'.`);
}

const status = runCapture('git status --porcelain');
if (status) fail('Working tree is not clean. Commit or stash changes first.');

try {
  runCapture('gh auth status');
} catch {
  fail('gh CLI not authenticated. Run: gh auth login');
}

// Verify package.json version matches the release
const pkgPath = path.join(HUB_DIR, 'package.json');
const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;
if (pkgVersion !== version) {
  fail(
    `rgfx-hub/package.json version is '${pkgVersion}' but releasing '${version}'.\n` +
    `Run first: npm run prepare-release -- ${tag}`
  );
}

console.log('Pre-flight checks passed.\n');

// --- Quality checks ---
console.log('Running quality checks...');
run('npm run typecheck', { cwd: HUB_DIR });
run('npm run lint', { cwd: HUB_DIR });
run('npm test', { cwd: HUB_DIR });

// --- Create tag ---
if (tagExistsLocally(tag)) {
  console.log(`\nTag ${tag} already exists locally.`);
} else {
  console.log(`\nCreating tag ${tag}...`);
  run(`git tag ${tag}`);
}

// --- Push tag ---
if (tagExistsOnRemote(tag)) {
  console.log(`Tag ${tag} already pushed to origin.`);
} else {
  console.log(`Pushing tag ${tag} to origin...`);
  run(`git push origin ${tag}`);
}

console.log(`\nTag pushed. GitHub Actions is now building the release.`);
console.log(`  Monitor: https://github.com/mfurniss/rgfx/actions`);
console.log(`  Or run:  gh run watch\n`);
