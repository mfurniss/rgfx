# Plan: Windows Build Workflow

## Overview

Create a documented, semi-automated process for building Windows installers on an available Windows PC. The workflow uses the same git tag as macOS releases and produces a Squirrel-based installer (.exe).

## Prerequisites on Windows PC

1. **Git** - Clone the repo
2. **Node.js 20+** - Match the version used in CI
3. **npm** - Comes with Node.js
4. **Visual Studio Build Tools** - Required for native module compilation

## Implementation Steps

### Step 1: Add Windows Maker to forge.config.ts

Add `MakerSquirrel` alongside the existing `MakerDMG`:

```typescript
import { MakerSquirrel } from "@electron-forge/maker-squirrel";

// In makers array:
new MakerSquirrel({
  name: "rgfx-hub",
  setupIcon: "./assets/icons/icon.ico",
  iconUrl: "https://rgfx.io/icon.ico", // For auto-update (optional)
}, ["win32"]),
```

### Step 2: Create Windows Build Script

Create `rgfx-hub/scripts/build-windows.ps1`:

```powershell
# Windows build script for RGFX Hub
# Run from rgfx-hub directory: .\scripts\build-windows.ps1

$ErrorActionPreference = "Stop"

Write-Host "Building RGFX Hub for Windows..." -ForegroundColor Cyan

# Verify we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Run this script from the rgfx-hub directory" -ForegroundColor Red
    exit 1
}

# Clean previous builds
if (Test-Path "out") {
    Remove-Item -Recurse -Force "out"
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci

# Run checks
Write-Host "Running type check..." -ForegroundColor Yellow
npm run typecheck

Write-Host "Running lint..." -ForegroundColor Yellow
npm run lint

Write-Host "Running tests..." -ForegroundColor Yellow
npm test

# Build the installer
Write-Host "Building Windows installer..." -ForegroundColor Yellow
npm run make -- --platform win32

Write-Host "`nBuild complete!" -ForegroundColor Green
Write-Host "Installer location: out\make\squirrel.windows\x64\" -ForegroundColor Cyan
```

### Step 3: Create Build Documentation

Create `docs/windows-build.md` with step-by-step instructions:

1. Clone repo / pull latest
2. Checkout the release tag: `git checkout v1.0.0`
3. Run version injection: `node scripts/inject-version-hub.js`
4. Navigate to rgfx-hub directory
5. Run build script: `.\scripts\build-windows.ps1`
6. Locate output in `out/make/squirrel.windows/x64/`
7. Upload to GitLab release manually

### Step 4: Update package.json Scripts

Add Windows-specific npm scripts:

```json
"make:win": "electron-forge make --platform win32",
"package:win": "electron-forge package --platform win32"
```

## Files to Modify

| File | Change |
|------|--------|
| [rgfx-hub/forge.config.ts](rgfx-hub/forge.config.ts) | Add MakerSquirrel import and configuration |
| [rgfx-hub/package.json](rgfx-hub/package.json) | Add Windows build scripts |
| `rgfx-hub/scripts/build-windows.ps1` | Create new PowerShell build script |
| `docs/windows-build.md` | Create new build documentation |

## Output Artifacts

The Squirrel maker produces:
- `rgfx-hub-{version} Setup.exe` - User-facing installer
- `rgfx-hub-{version}-full.nupkg` - NuGet package (for auto-update)
- `RELEASES` - Release manifest file

## Future Enhancements (Not in Scope)

- Code signing with Authenticode certificate
- GitHub Actions Windows runner for automated builds
- Auto-update support via Squirrel
- MSIX/Windows Store distribution

## Testing Checklist

After building on Windows:
- [ ] Installer runs without errors
- [ ] App launches after installation
- [ ] MAME integration works (event file reading)
- [ ] Network discovery finds drivers
- [ ] Uninstaller works cleanly
