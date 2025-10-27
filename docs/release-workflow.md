# RGFX Release Workflow

This document describes the complete release workflow for the RGFX project, including version management, CI/CD pipeline, and release approval process.

## Overview

RGFX uses a **tag-based semantic versioning** approach where:
- Git tags are the single source of truth for versions
- CI/CD builds only on tagged releases (not on every commit)
- All release artifacts (Hub app + Driver firmware) share the same version
- Release notes are auto-generated and you manually approve release creation
- **Note**: GitLab does not support draft releases - manual job trigger is the approval mechanism

## Prerequisites

Before creating a release, ensure:

1. **All changes are committed and pushed to `main`**
   ```bash
   git status  # Should show clean working tree
   ```

2. **Tests pass locally**
   ```bash
   cd rgfx-hub && npm run check
   cd ../esp32 && pio run
   ```

3. **Version number decided** using semantic versioning:
   - `MAJOR.MINOR.PATCH` (e.g., `1.0.0`)
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

## Release Process

### Step 1: Create Git Tag

Create and push a semantic version tag:

```bash
# Create annotated tag (recommended - includes metadata)
git tag -a v1.0.0 -m "Release version 1.0.0"

# Or lightweight tag
git tag v1.0.0

# Push tag to GitLab (triggers CI/CD)
git push origin v1.0.0
```

**Tag Format**: Always use `vMAJOR.MINOR.PATCH` (e.g., `v1.0.0`, `v2.1.3`)

### Step 2: CI/CD Pipeline Runs Automatically

Once the tag is pushed, GitLab CI automatically:

1. **Detects the tag** and extracts version (e.g., `v1.0.0` → `1.0.0`)
2. **Injects version** into all artifacts:
   - Hub: Updates `package.json` version field
   - Driver: Generates `src/version.h` with version constants
3. **Builds Hub** (macOS only):
   - Installs dependencies (`npm ci`)
   - Runs TypeScript type checking (`npm run typecheck`) - **errors = FAIL**
   - Runs ESLint (`npm run lint`) - **errors AND warnings = FAIL**
   - Runs unit tests (`npm test`) - **any failure = FAIL**
   - Creates distributable package (`npm run make`)
4. **Builds Driver**:
   - Compiles ESP32 firmware with PlatformIO (`pio run`) - **compile errors = FAIL**
   - Runs PlatformIO tests (`pio test`) - **any failure = FAIL**
   - Copies firmware to `esp32-installer/`
5. **Deploys to GitLab Pages**:
   - Copies `esp32-installer/` to GitLab Pages → https://rgfx.io
6. **Waits for manual approval**:
   - `create:release` job appears with "Play" button
   - Pipeline pauses - awaiting your approval

### Step 3: Review Build and Approve Release

1. **Navigate to GitLab Pipeline**:
   - Go to your RGFX GitLab project
   - Click **CI/CD > Pipelines** in the left sidebar
   - Click on the pipeline for your tag

2. **Review Build Results**:
   - Verify `build:hub` job succeeded (green checkmark)
   - Verify `build:driver` job succeeded (green checkmark)
   - Verify `pages` job succeeded (ESP32 installer deployed)
   - Check build logs if needed

3. **Download and Test Artifacts** (Optional but Recommended):
   - Click on `build:hub` job → Browse artifacts
   - Download Hub .zip file and test it
   - Click on `build:driver` job → Browse artifacts
   - Verify firmware version is correct
   - Test ESP32 web installer at https://rgfx.io

4. **Approve Release Creation**:
   - Scroll to `create:release` job (shows "Play" button icon)
   - Click the **Play** button to approve
   - CI immediately creates release with all artifacts attached
   - Release notes are auto-generated from commits

### Step 4: ESP32 Web Installer (Already Deployed)

The ESP32 web installer is automatically deployed to GitLab Pages:
- **URL**: https://rgfx.io
- Users can flash firmware directly from their browser using ESP Web Tools
- Updated on every tagged release

## Version Management

### How Versions Flow Through the System

```
Git Tag (v1.0.0)
    ├─> Hub package.json (version: "1.0.0")
    │   └─> Displayed in Hub UI (About dialog, window title)
    ├─> Driver src/version.h (#define VERSION "1.0.0")
    │   └─> Displayed on Driver (serial logs, OLED, MQTT)
    └─> ESP32 Installer manifest.json (version: "1.0.0")
        └─> Shown in web installer UI
```

### Version Display Locations

**Hub Application:**
- About dialog (Help > About RGFX Hub)
- Window title bar
- Startup logs
- MQTT discovery messages

**Driver Firmware:**
- Serial monitor on boot
- OLED display (if connected)
- Web configuration portal
- MQTT system info messages

### Checking Current Version

**Hub:**
```bash
cd rgfx-hub
npm run start
# Check Help > About or look at logs
```

**Driver:**
```bash
cd esp32
pio run -t upload && pio device monitor
# Version shown in boot logs
```

**Latest Git Tag:**
```bash
git describe --tags --abbrev=0
# Example output: v1.0.0
```

## Development Builds

For testing the CI pipeline without creating an official release:

### Manual CI Trigger

GitLab allows manual pipeline runs:

1. Go to **CI/CD > Pipelines**
2. Click **Run Pipeline**
3. Select branch `main`
4. Pipeline runs but does NOT create a release (only runs tests/builds)

### Development Version Format

Development builds use version format: `X.Y.Z-dev+<commit-hash>`

Example: `1.0.0-dev+abc1234`

This clearly indicates:
- Base version (1.0.0)
- Development build (not official release)
- Specific commit (abc1234)

## CI/CD Pipeline Details

### Pipeline Stages

```yaml
stages:
  - build      # Build Hub and Driver
  - test       # Run tests
  - deploy     # Deploy ESP32 installer to Pages
  - release    # Create GitLab release (draft)
```

### Jobs

**`build:hub` (runs only on tags)**
- Environment: Node.js 20
- Injects version from git tag
- Runs `npm run check` (typecheck + lint + test)
- Runs `npm run make` (creates macOS distributable)
- Uploads artifact: `rgfx-hub-macos.zip`

**`build:driver` (runs only on tags)**
- Environment: Node.js 20 + PlatformIO
- Injects version from git tag
- Compiles ESP32 firmware
- Copies to esp32-installer/
- Uploads artifacts: `firmware.bin`, `manifest.json`

**`deploy:pages` (runs only on tags)**
- Deploys `esp32-installer/` to GitLab Pages
- Makes web-based firmware installer publicly accessible

**`release:draft` (runs only on tags)**
- Generates release notes from commits
- Creates draft release in GitLab
- Attaches all build artifacts
- Waits for manual approval

## Release Notes

### Auto-Generation

Release notes are automatically generated from git commits between tags:

```bash
# Example: commits between v0.9.0 and v1.0.0
git log v0.9.0..v1.0.0 --pretty=format:"- %s" --reverse
```

**Generated format:**
```markdown
## What's Changed
- Add OLED display support
- Fix MQTT reconnection bug
- Update FastLED to 3.6.0
- Improve WiFi stability

## Commits
Full list of commits: v0.9.0...v1.0.0
```

### Best Practices for Commit Messages

To get good auto-generated release notes, write clear commit messages:

**Good:**
```
Add OLED display support for status monitoring
Fix MQTT reconnection infinite loop
Update FastLED library to 3.6.0
```

**Bad:**
```
wip
fix stuff
update
```

**Recommended format:**
```
<type>: <description>

Examples:
feat: Add dual-core processing for ESP32
fix: Resolve MQTT reconnection issue
docs: Update architecture documentation
chore: Bump dependencies
```

## Troubleshooting

### Tag Push Doesn't Trigger CI

**Problem**: Pushed tag but no pipeline runs.

**Solution**:
1. Check `.gitlab-ci.yml` has `only: [tags]` configuration
2. Verify tag format is `vX.Y.Z` (not `X.Y.Z`)
3. Check GitLab CI/CD settings are enabled

### Build Fails on Tag

**Problem**: Pipeline fails when building tagged release.

**Solution**:
1. Always test builds locally before tagging:
   ```bash
   cd rgfx-hub && npm run check && npm run make
   cd ../esp32 && pio run
   ```
2. Check CI logs for specific error
3. If needed, delete tag and fix issue:
   ```bash
   git tag -d v1.0.0          # Delete local
   git push origin :refs/tags/v1.0.0  # Delete remote
   ```

### Version Not Updated in Build

**Problem**: Built artifacts still show old version.

**Solution**:
1. Verify version injection scripts ran successfully
2. Check CI logs for version injection output
3. Ensure tag format is correct (`v1.0.0` not `1.0.0`)

### Need to Update Release After Publishing

**Problem**: Found issue after publishing release.

**Solution**:
1. **Patch release**: Create new tag with incremented patch version
   ```bash
   git tag v1.0.1 -m "Fix critical bug in v1.0.0"
   git push origin v1.0.1
   ```
2. **Update existing release**: Edit release notes in GitLab to add errata
3. **Major issue**: Mark release as deprecated, create new release

## Example Scenarios

### Scenario 1: First Major Release

```bash
# Situation: Ready for v1.0.0 release
git checkout main
git pull
npm run check  # Verify everything works
git tag -a v1.0.0 -m "First stable release"
git push origin v1.0.0

# Wait for CI to complete
# Review draft release on GitLab
# Edit release notes to add highlights
# Publish release
```

### Scenario 2: Bug Fix Release

```bash
# Situation: Fixed critical bug, need v1.0.1
git checkout main
git pull
git log v1.0.0..HEAD  # Review commits since last release
git tag v1.0.1 -m "Bug fix release"
git push origin v1.0.1

# CI runs automatically
# Review and publish
```

### Scenario 3: Testing CI Pipeline

```bash
# Situation: Want to test CI without creating release

# Option 1: Manual pipeline trigger
# Go to GitLab > CI/CD > Pipelines > Run Pipeline
# Select 'main' branch
# Pipeline runs tests but doesn't create release

# Option 2: Create dev tag (if supported)
git tag v1.1.0-dev
git push origin v1.1.0-dev
# Delete after testing:
git push origin :refs/tags/v1.1.0-dev
```

## Version History

Track your releases and their purposes:

| Version | Date | Type | Description |
|---------|------|------|-------------|
| v1.0.0 | TBD | Major | First stable release |
| v0.1.0 | TBD | Minor | Initial beta with core features |

**Tip**: GitLab automatically maintains version history in Releases page.

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [GitLab Release Documentation](https://docs.gitlab.com/ee/user/project/releases/)
- [Conventional Commits](https://www.conventionalcommits.org/) (optional for better release notes)
