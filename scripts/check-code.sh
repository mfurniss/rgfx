#!/bin/bash
# Code quality check script for all projects
# Runs checks for: rgfx-hub (TypeScript), esp32 (PlatformIO), mame (Lua)

set -e

ROOT_DIR="$(git rev-parse --show-toplevel)"

echo "🔍 Running code quality checks..."
echo ""

# 1. rgfx-hub checks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 rgfx-hub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$ROOT_DIR/rgfx-hub"

echo "📝 TypeScript type checking..."
npm run typecheck
echo "✅ TypeScript passed"

echo "🔧 Running ESLint..."
npm run lint
echo "✅ ESLint passed"

echo "🔍 Checking for unused exports..."
npm run unused-exports
echo "✅ No unused exports found"

echo "🧪 Running tests..."
npm test
echo "✅ Tests passed"

echo ""

# 2. esp32 checks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 esp32"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$ROOT_DIR/esp32"

echo "🔨 Building esp32 firmware..."
pio run -e rgfx-driver
echo "✅ esp32 build passed"

echo "🧪 Running esp32 tests..."
pio test -e native
echo "✅ esp32 tests passed"

echo ""

# 3. Lua checks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎮 mame lua scripts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$ROOT_DIR/rgfx-hub/assets/mame"

echo "🔍 Running luacheck..."
luacheck *.lua
echo "✅ Lua checks passed"

echo ""
echo "✨ All code quality checks passed!"
