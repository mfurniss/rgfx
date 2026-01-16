#!/bin/bash
# Code quality check script for all projects
# Runs checks for: rgfx-hub (TypeScript), esp32 (PlatformIO), mame (Lua)
#
# Usage:
#   ./check-code.sh        # Run checks only for staged files
#   ./check-code.sh --all  # Run all checks regardless of staged files

set -e

ROOT_DIR="$(git rev-parse --show-toplevel)"

# macOS notification helper (requires: brew install terminal-notifier)
notify() {
    terminal-notifier -title "RGFX Pre-commit" -message "$1" 2>/dev/null || true
}

# Notify on failure
trap 'notify "Pre-commit checks failed!"' ERR

# Determine which areas have changes based on staged files
HUB_CHANGES=false
ESP32_CHANGES=false
LUA_CHANGES=false

if [ "$1" = "--all" ]; then
    # Force all checks
    HUB_CHANGES=true
    ESP32_CHANGES=true
    LUA_CHANGES=true
else
    # Get staged files (if any)
    STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")

    if [ -z "$STAGED_FILES" ]; then
        # No staged files (running manually) - run all checks
        HUB_CHANGES=true
        ESP32_CHANGES=true
        LUA_CHANGES=true
    else
        # Check each staged file to determine which checks to run
        for file in $STAGED_FILES; do
            case "$file" in
                rgfx-hub/assets/mame/*.lua|rgfx-hub/assets/interceptors/*.lua)
                    LUA_CHANGES=true
                    ;;
                rgfx-hub/*)
                    HUB_CHANGES=true
                    ;;
                esp32/*)
                    ESP32_CHANGES=true
                    ;;
            esac
        done
    fi
fi

# Check if any code changes detected
if [ "$HUB_CHANGES" = false ] && [ "$ESP32_CHANGES" = false ] && [ "$LUA_CHANGES" = false ]; then
    echo "📄 No code changes detected (docs only), skipping checks"
    exit 0
fi

notify "Starting pre-commit checks..."
echo "🔍 Running code quality checks..."
echo ""

# 1. rgfx-hub checks
if [ "$HUB_CHANGES" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 rgfx-hub"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$ROOT_DIR/rgfx-hub"

    notify "Checking dependencies..."
    echo "🔒 Checking for dependency vulnerabilities..."
    npm audit --audit-level=critical
    echo "✅ No critical vulnerabilities found"

    notify "TypeScript type checking..."
    echo "📝 TypeScript type checking..."
    npm run typecheck
    echo "✅ TypeScript passed"

    notify "Running ESLint..."
    echo "🔧 Running ESLint..."
    npm run lint
    echo "✅ ESLint passed"

    echo "🔍 Checking for unused exports..."
    npm run unused-exports
    echo "✅ No unused exports found"

    notify "Running Hub tests..."
    echo "🧪 Running tests..."
    npm test
    echo "✅ Tests passed"

    echo "📦 Checking for unused dependencies..."
    # Note: colord and d3-scale may be unused - audit separately
    npx depcheck --ignores="@types/*,electron,@electron-forge/*,@testing-library/*,@vitest/*,depcheck,license-checker,sharp,png2icons,colord,d3-scale,@eslint/*"
    echo "✅ No unused dependencies found"

    echo "📜 Checking dependency licenses..."
    npx license-checker --onlyAllow "MIT;ISC;BSD-2-Clause;BSD-3-Clause;Apache-2.0;0BSD;CC0-1.0;Unlicense;Python-2.0;BlueOak-1.0.0;MPL-2.0"
    echo "✅ All licenses are permissive"

    echo ""
fi

# 2. esp32 checks
if [ "$ESP32_CHANGES" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔌 esp32"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$ROOT_DIR/esp32"

    notify "Building ESP32 firmware..."
    echo "🔨 Building esp32 firmware..."
    pio run -e rgfx-driver
    echo "✅ esp32 build passed"

    notify "Running ESP32 tests..."
    echo "🧪 Running esp32 tests..."
    pio test -e native
    echo "✅ esp32 tests passed"

    echo ""
fi

# 3. Lua checks
if [ "$LUA_CHANGES" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎮 mame lua scripts"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$ROOT_DIR/rgfx-hub/assets/mame"

    notify "Running Lua checks..."
    echo "🔍 Running luacheck..."
    luacheck *.lua
    echo "✅ Lua checks passed"

    echo ""
fi

notify "All checks passed!"
echo "✨ All code quality checks passed!"
