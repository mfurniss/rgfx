# Development Workflow

## Development Environment

**Platform:** macOS only - all development is done on Mac. Use Mac-specific commands and shortcuts (Cmd instead of Ctrl, etc.)

**CRITICAL - READ ESLINT CONFIG AT SESSION START:**
- **ALWAYS read and understand** `rgfx-hub/eslint.config.mjs` at the start of each new session
- This ensures familiarity with the project's strict linting rules
- Key points from ESLint config:
  - Uses TypeScript strict type checking (`strictTypeChecked` + `stylisticTypeChecked`)
  - React + React Hooks rules enforced
  - Prefer nullish coalescing (`??`) over logical OR (`||`) for safer operations
  - Test files have relaxed rules (allow `any`, unsafe operations, etc.)
  - All ESLint warnings are treated as errors in CI

**CRITICAL - MAME on macOS:**
- **ALWAYS launch MAME in windowed mode** using `-window` flag
- **NEVER use fullscreen mode** - there is a bug that can crash MAME on macOS
- The `launch.sh` script already includes `-window -nomaximize` flags

**CRITICAL - Testing MAME with Claude:**
- **NEVER try to capture MAME output with background processes, timeouts, or redirects** - buffering causes output to be lost
- **ALWAYS ask the user to run the command and paste the console output** rather than trying to automate it

**CRITICAL - Cleanup Temporary Files:**
- **ALWAYS cleanup temporary files and directories** created during debugging or testing
- Common locations: `/tmp/`, `/private/tmp/`, test clone directories

**CRITICAL - Analyzing User-Provided Logs:**
- **ALWAYS read the ENTIRE log output** when the user pastes logs
- **NEVER make assumptions** based only on the beginning or partial sections of logs
- Look for patterns and events across the **full timeline** of the log
- The beginning of logs may show initialization before the actual events occur
- **NEVER conclude something isn't working** based only on incomplete log analysis

## Automated Backups to Google Drive

- **Automatic daily backups** are configured via launchd agent
- **Runs daily at 2:00 AM** - creates Git bundle backup to Google Drive
- **Script location**: `scripts/backup-to-gdrive.js`
- **Backup location**: `~/Google Drive/My Drive/Backups/rgfx/`
- **Retention**: Keeps last 30 daily backups, auto-deletes older ones
- **Manual backup**: Run `node scripts/backup-to-gdrive.js` anytime
- **View logs**: `tail -f ~/Library/Logs/rgfx-backup.log`
- **Manage service**:
  - Stop: `launchctl unload ~/Library/LaunchAgents/com.rgfx.backup.plist`
  - Start: `launchctl load ~/Library/LaunchAgents/com.rgfx.backup.plist`
  - Status: `launchctl list | grep rgfx`

## Claude Specialized Agents

**CRITICAL - USE SPECIALIZED AGENTS FOR EXPERTISE:**

This project has specialized Claude agents available for specific domains. **ALWAYS use these agents** when working with their respective technologies.

**gitlab-expert**
- **Use for**: GitLab CI/CD pipelines, GitLab Pages, jobs, runners, merge requests, branch protection, tags, releases, glab CLI
- **Also use for**: Debugging pipeline failures, configuring `.gitlab-ci.yml`, troubleshooting build artifacts, understanding GitLab's browser UI

**platformio-esp32-expert**
- **Use for**: PlatformIO development for ESP32 microcontrollers
- **Topics include**:
  - Setting up or configuring PlatformIO projects for ESP32
  - Understanding `platformio.ini` configuration options and environments
  - Troubleshooting ESP32 compilation, upload, or runtime issues
  - Integrating PlatformIO with VSCode (tasks, debugging, IntelliSense)
  - ESP32-specific features (dual-core, WiFi, Bluetooth, peripherals)
  - Build flags, library dependencies, and board configurations
  - OTA updates, serial monitoring, and debugging workflows
  - Memory management, SPIFFS/LittleFS, and NVS storage on ESP32

## Planning and Documentation Preferences

**CRITICAL - NO TIMELINES IN PLANS:**
- **NEVER include time estimates, day counts, or schedules** in implementation plans
- User does NOT want to see "Day 1:", "3-5 days", "Estimated timeline", etc.
- **Focus on logical phases and implementation steps** without time projections

**CRITICAL - JOURNAL ENTRY STANDARDS:**

Journal entries are **concise daily summaries**, not detailed bug reports. Each entry should capture what was accomplished in 2-3 sentences maximum.

**Rules:**

1. **Keep it high-level and concise** - Focus on what was built/improved, not implementation details
2. **Scope to the entire day** - Summarize all work done that day in a few sentences
3. **No detailed root cause analysis** - Don't explain why bugs happened or how they were fixed
4. **No step-by-step details** - Don't break down the implementation process

**Good example (concise daily summary):**
```
Implemented LED progress indicator for OTA firmware updates showing orange LED moving across strip/matrix during upload. Enhanced firmware deployment pipeline with automatic manifest.json generation including SHA256 checksums for integrity validation. Improved Hub test suite by consolidating redundant tests.
```

**Bad example (too detailed):**
```
Fixed critical OTA LED progress indicator bug where orange progress LEDs stopped displaying during firmware updates. Root cause was OTA callbacks using global pointer variables that referenced the Matrix's LED buffer, which became stale when Matrix was recreated during LED configuration changes. Refactored all OTA callbacks to access LED hardware directly via getLEDsForDevice() at runtime, completely decoupling OTA feedback from the Matrix system.

Enhanced firmware deployment pipeline by adding automatic manifest.json generation with SHA256 checksums in copy_firmware.py. This ensures USB serial flashing from Hub correctly detects firmware versions and validates file integrity...
```

## Incremental Implementation and Testing

**CRITICAL - INCREMENTAL IMPLEMENTATION AND TESTING:**

Like a veteran professional engineer with decades of experience, **ALWAYS work incrementally**:

1. **One change at a time** - Make small, focused changes
2. **Test after each change** - Compile, run tests, verify functionality
3. **Never batch changes** - Don't implement multiple features before testing
4. **Verify before proceeding** - Each step must work before moving to the next
5. **Use TodoWrite to track** - Break work into small, testable increments

## Pre-Commit Checks

**CRITICAL - PRE-COMMIT CHECKS:**

This project uses a **pre-commit hook** to enforce code quality. The hook automatically runs before every commit:

1. **TypeScript type checking** (`npm run typecheck`)
2. **ESLint with auto-fix** (`npm run lint -- --fix`)
3. **Unit tests** (`npm test`)

**All checks must pass** before the commit is allowed. Install: `./scripts/install-git-hooks.sh`

**CRITICAL - ALWAYS LINT AFTER EDITING:**

Before committing ANY code changes, manually run these checks during development:

```bash
cd rgfx-hub
npm run lint -- --fix  # Auto-fix formatting and lint issues
npm run typecheck      # Check TypeScript errors
npm test               # Run unit tests
```

## Feature Branch Workflow

**CRITICAL - FEATURE BRANCH WORKFLOW:**

This project uses a **feature branch workflow** with CI/CD testing and merge request approvals. The `main` branch is **protected** - you cannot push directly to it.

**ALL changes must go through feature branches and merge requests.** No exceptions.

### Workflow Steps:

**1. Create a feature branch:**
```bash
git checkout main
git pull origin main
git checkout -b feature/my-new-feature
# Make changes...
git commit -m "Add new feature"
git push origin feature/my-new-feature
```

**2. CI runs automatically:**
- **Test stage** runs on your feature branch
- TypeScript checks, ESLint, unit tests, ESP32 compilation
- Must pass before you can merge

**3. Create a merge request:**

```bash
glab mr create --fill --yes
```

**CRITICAL - MR OVERVIEW MUST SUMMARIZE ALL COMMITS:**

When creating the MR overview/description, **ALWAYS summarize ALL commits** in the merge request, not just the first one. The overview should provide a comprehensive summary of the entire branch's changes.

**CRITICAL - ALWAYS MONITOR CI PIPELINES:**

After pushing a feature branch or creating a merge request, **ALWAYS actively monitor the CI pipeline** until completion.

**Required workflow:**
1. After `git push` or `glab mr create`, immediately check initial status:
   ```bash
   glab ci status -b <branch-name>
   ```
2. **Inform the user immediately**:
   - "Pipeline started. Jobs: test:hub, test:driver (~5 min typical duration)"
   - Provide pipeline URL for manual monitoring
   - State: "I will actively monitor and notify you when it completes"
3. **Set up active polling loop:**
   - Every 60 seconds (1 minute), run: `glab ci status -b <branch-name>`
   - Parse the output to detect state changes
   - Look for "Pipeline state: running" vs "Pipeline state: success/failed"
4. **When pipeline completes**, notify the user IMMEDIATELY with a clear message:
   - **Success**: "PIPELINE PASSED! All tests successful (test:hub: 2m 48s, test:driver: 4m 27s)"
   - **Failure**: "PIPELINE FAILED! Job '<job-name>' failed. Fetching logs..." then run `glab ci trace <job-name>`
5. If failed, automatically fetch and analyze error logs

**Why active polling instead of --live background:**
- Background `--live` processes exit unpredictably and don't trigger notifications
- Active polling ensures reliable state change detection
- Direct control over when to check and when to notify
- Can parse output reliably and trigger immediate user alerts

**DO NOT use `--live` with `run_in_background`** - it doesn't work for reliable monitoring

**4. Main branch updated** - Test + Build stages run, artifacts created

**5. Create a release:**
```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

### GitLab CLI (glab)

```bash
brew install glab
glab auth login  # First-time authentication
glab mr create --fill --yes
glab mr list
glab ci status -b <branch-name>
```

## Scripting Language Preference

**CRITICAL - ALWAYS USE NODE.JS FOR SCRIPTS:**

- **Preferred**: Node.js/JavaScript for ALL custom scripts
- **Avoid**: Python scripts unless absolutely necessary
- **Rationale**: Consistent tooling, better IDE support, easier maintenance

## Release Management

**For creating releases, see [docs/release-workflow.md](../../docs/release-workflow.md)**

Key points:
- Git tags are source of truth (`v1.0.0`)
- Semantic versioning (MAJOR.MINOR.PATCH)
- CI/CD builds only on tags
- Manual release approval in GitLab

Version injection:
```bash
node scripts/inject-version-hub.js     # Updates rgfx-hub/package.json
node scripts/inject-version-driver.js  # Generates esp32/src/version.h
```
