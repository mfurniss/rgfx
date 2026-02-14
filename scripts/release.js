#!/usr/bin/env node
/**
 * Full RGFX release workflow: tag, push, wait for CI, build Hub installer, upload.
 *
 * Usage:
 *   npm run release -- v0.5.0     # Create tag, push, wait for CI, build, upload
 *   npm run release               # Resume — auto-detect tag from current HEAD
 *
 * What it does:
 *   1. Injects version, builds docs, runs quality checks (before pushing)
 *   2. Creates git tag and pushes to origin
 *   3. Waits for CI pipeline to finish and create the GitLab release
 *   4. Builds the Hub installer (DMG on macOS, EXE on Windows)
 *   5. Copies installer to rgfx-hub/out/release/<platform>/
 *   6. Uploads to the GitLab release
 *
 * Prerequisites:
 *   - glab CLI authenticated (glab auth status)
 *   - Working tree must be clean
 *   - Must be on main branch (or on the tag for resume)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.join(__dirname, '..');
const HUB_DIR = path.join(ROOT_DIR, 'rgfx-hub');
const MAKE_DIR = path.join(HUB_DIR, 'out', 'make');
const RELEASE_DIR = path.join(HUB_DIR, 'out', 'release');

const CI_POLL_INTERVAL_MS = 30_000;

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Find files matching a predicate recursively under a directory.
 */
function findFiles(dir, predicate) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, predicate));
    } else if (predicate(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check if a git tag exists locally.
 */
function tagExistsLocally(tagName) {
  try {
    runCapture(`git rev-parse --verify refs/tags/${tagName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a git tag exists on the remote.
 */
function tagExistsOnRemote(tagName) {
  try {
    const result = runCapture(`git ls-remote --tags origin refs/tags/${tagName}`);
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a GitLab release exists for the given tag.
 */
function releaseExists(tagName) {
  try {
    runCapture(`glab release view ${tagName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Poll CI pipeline status until it completes.
 */
async function waitForCI(tagName) {
  console.log(`\nWaiting for CI pipeline on ${tagName}...`);
  console.log(`  (polling every ${CI_POLL_INTERVAL_MS / 1000}s)\n`);

  while (true) {
    try {
      const output = runCapture(`glab ci status -b ${tagName}`);

      if (/failed/i.test(output)) {
        console.log(output);
        fail(`CI pipeline failed for ${tagName}. Check the pipeline and fix before retrying.`);
      }

      if (/success/i.test(output) || /passed/i.test(output)) {
        console.log('  CI pipeline passed.');
        return;
      }

      // Still running — show status and wait
      const statusLine = output.split('\n').find(l => /pipeline/i.test(l) || /status/i.test(l)) || output.split('\n')[0];
      process.stdout.write(`  ${statusLine}\r`);
    } catch {
      // glab ci status can fail if pipeline hasn't started yet
      process.stdout.write('  Waiting for pipeline to start...\r');
    }

    await sleep(CI_POLL_INTERVAL_MS);
  }
}

// --- Main (async for CI polling) ---
(async () => {
  // --- Resolve tag ---
  const explicitTag = process.argv[2];
  let tag;

  if (explicitTag) {
    tag = explicitTag;
  } else {
    try {
      tag = runCapture('git describe --exact-match --tags HEAD');
    } catch {
      fail('No tag specified and HEAD is not on a version tag.\nUsage: npm run release -- v0.5.0');
    }
  }

  if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
    fail(`Tag '${tag}' doesn't match vMAJOR.MINOR.PATCH format`);
  }

  const version = tag.slice(1);
  const platform = os.platform();
  const platformName = platform === 'darwin' ? 'macOS' : 'Windows';

  console.log(`\nRGFX Release — ${version} (${platformName})\n`);

  // --- Pre-flight checks ---

  // Must be on main branch (or detached HEAD on a tag for resume)
  const branch = runCapture('git rev-parse --abbrev-ref HEAD');
  if (branch !== 'main' && branch !== 'HEAD') {
    fail(`Must be on main branch to release. Currently on '${branch}'.\nRun: git checkout main`);
  }

  // Clean working tree
  const status = runCapture('git status --porcelain');
  if (status) {
    fail('Working tree is not clean. Commit or stash changes first.');
  }

  // glab authentication
  try {
    runCapture('glab auth status');
  } catch {
    fail('glab CLI not authenticated. Run: glab auth login');
  }

  console.log('Pre-flight checks passed.\n');

  // --- Step 1: Inject version ---
  console.log('Injecting version...');
  run('node scripts/inject-version-hub.js');

  // --- Step 2: Build docs (macOS only — Windows skips per forge config) ---
  if (platform === 'darwin') {
    console.log('\nBuilding docs...');
    run('npm run docs:build');
  }

  // --- Step 3: Run quality checks ---
  console.log('\nRunning quality checks...');
  run('npm run typecheck', { cwd: HUB_DIR });
  run('npm run lint', { cwd: HUB_DIR });
  run('npm test', { cwd: HUB_DIR });

  // --- Step 4: Create tag if needed ---
  if (tagExistsLocally(tag)) {
    console.log(`\nTag ${tag} already exists locally.`);
  } else {
    console.log(`\nCreating tag ${tag}...`);
    run(`git tag ${tag}`);
  }

  // --- Step 5: Push tag if needed ---
  if (tagExistsOnRemote(tag)) {
    console.log(`Tag ${tag} already pushed to origin.`);
  } else {
    console.log(`Pushing tag ${tag} to origin...`);
    run(`git push origin ${tag}`);
  }

  // Checkout the tag so HEAD is at the exact release commit
  const currentTag = (() => {
    try { return runCapture('git describe --exact-match --tags HEAD'); }
    catch { return null; }
  })();
  if (currentTag !== tag) {
    console.log(`Checking out ${tag}...`);
    run(`git checkout ${tag}`);
  }

  // --- Step 6: Wait for CI and release creation ---
  if (releaseExists(tag)) {
    console.log(`GitLab release ${tag} already exists.`);
  } else {
    await waitForCI(tag);

    // CI pipeline passed — wait a moment for the release job to complete
    console.log('\nWaiting for release to be created...');
    let attempts = 0;
    while (!releaseExists(tag) && attempts < 20) {
      await sleep(CI_POLL_INTERVAL_MS);
      attempts++;
    }

    if (!releaseExists(tag)) {
      fail(
        `Release ${tag} was not created by CI.\n` +
        'Create it manually: glab release create ' + tag + ' --name "RGFX ' + tag + '" --notes "Release ' + version + '"'
      );
    }
  }

  // --- Step 7: Build installer ---
  console.log('\nBuilding installer...');
  run('npm run make', { cwd: HUB_DIR });

  // --- Step 8: Copy to normalized release directory ---
  console.log('\nPreparing release artifact...');

  const platformDir = platform === 'darwin' ? 'macos' : 'windows';
  const releaseSubDir = path.join(RELEASE_DIR, platformDir);

  fs.rmSync(RELEASE_DIR, { recursive: true, force: true });
  fs.mkdirSync(releaseSubDir, { recursive: true });

  let artifact;

  if (platform === 'darwin') {
    const dmgFiles = findFiles(MAKE_DIR, name => name.endsWith('.dmg'));
    if (dmgFiles.length === 0) {
      fail('No .dmg found in rgfx-hub/out/make/');
    }
    artifact = dmgFiles[0];
  } else {
    // Windows: find the Setup.exe, ignore .nupkg and RELEASES
    const exeFiles = findFiles(MAKE_DIR, name => name.endsWith('.exe'));
    if (exeFiles.length === 0) {
      fail('No .exe found in rgfx-hub/out/make/');
    }
    artifact = exeFiles[0];
  }

  const artifactName = path.basename(artifact);
  const releasePath = path.join(releaseSubDir, artifactName);
  fs.copyFileSync(artifact, releasePath);

  console.log(`  ${platformDir}/${artifactName}`);

  // --- Step 9: Upload to GitLab release ---
  console.log(`\nUploading to release ${tag}...`);
  run(`glab release upload ${tag} "${releasePath}"`);

  console.log(`\nDone! ${artifactName} uploaded to release ${tag}`);
  console.log(`View: glab release view ${tag}`);
})();
