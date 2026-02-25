#!/usr/bin/env node
/**
 * Prepare a release by bumping package.json and opening an MR.
 *
 * Usage:
 *   npm run prepare-release -- v0.7.0
 *
 * What it does:
 *   1. Creates branch release/v0.7.0
 *   2. Bumps rgfx-hub/package.json to 0.7.0
 *   3. Commits, pushes, and opens a merge request
 *
 * After merging the MR, run: npm run release -- v0.7.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

function run(cmd) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit', encoding: 'utf-8' });
}

function runCapture(cmd) {
  return execSync(cmd, {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function fail(msg) {
  console.error(`\nError: ${msg}`);
  process.exit(1);
}

// --- Validate input ---
const tag = process.argv[2];
if (!tag) fail('Usage: npm run prepare-release -- v0.7.0');
if (!/^v\d+\.\d+\.\d+$/.test(tag)) fail(`Tag '${tag}' doesn't match vMAJOR.MINOR.PATCH format`);

const version = tag.slice(1);
const branch = `release/${tag}`;

console.log(`\nPrepare Release — ${version}\n`);

// --- Pre-flight ---
const currentBranch = runCapture('git rev-parse --abbrev-ref HEAD');
if (currentBranch !== 'main') {
  fail(`Must be on main branch. Currently on '${currentBranch}'.`);
}

const status = runCapture('git status --porcelain');
if (status) fail('Working tree is not clean. Commit or stash changes first.');

// --- Bump version ---
console.log(`Creating branch ${branch}...`);
run(`git checkout -b ${branch}`);

const pkgPath = path.join(ROOT_DIR, 'rgfx-hub', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
console.log(`  Updated rgfx-hub/package.json to ${version}`);

// --- Commit, push, open MR ---
run('git add rgfx-hub/package.json');
run(`git commit -m "Bump hub version to ${version}"`);
run(`git push -u origin ${branch}`);
run(`glab mr create --title "Release ${tag}" --target-branch main --remove-source-branch --fill`);

// --- Return to main ---
run('git checkout main');

console.log(`\nDone! Merge the MR, pull main, then run:`);
console.log(`  npm run release -- ${tag}\n`);
