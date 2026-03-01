#!/bin/bash
# Code quality check script for all projects
# Runs checks for: rgfx-hub (TypeScript), esp32 (PlatformIO), mame (Lua)
#
# Usage:
#   ./check-code.sh        # Run checks for staged files, or unstaged changes if nothing staged
#   ./check-code.sh --all  # Run all checks regardless of changed files

set -e

ROOT_DIR="$(git rev-parse --show-toplevel)"

# Cross-platform notification helper
# macOS: brew install terminal-notifier
# Windows: uses native Toast API (no install required)
notify() {
    case "$(uname -s)" in
        Darwin)
            terminal-notifier -title "RGFX Code Checks" -message "$1" 2>/dev/null || true
            ;;
        MINGW*|MSYS*|CYGWIN*)
            powershell.exe -Command "
                [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
                [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
                \$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText01)
                \$xml.GetElementsByTagName('text').Item(0).InnerText = '$1'
                \$toast = [Windows.UI.Notifications.ToastNotification]::new(\$xml)
                [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('RGFX Code Checks').Show(\$toast)
            " 2>/dev/null || true
            ;;
    esac
}

# Notify on failure
trap 'notify "Code checks failed!"' ERR

# Determine which areas have changes based on staged files
HUB_CHANGES=false
ESP32_CHANGES=false
LUA_CHANGES=false
DOCS_CHANGES=false

# Helper function to classify files and set change flags
classify_files() {
    local files="$1"
    for file in $files; do
        case "$file" in
            rgfx-hub/assets/mame/*.lua|rgfx-hub/assets/interceptors/*.lua)
                LUA_CHANGES=true
                ;;
            rgfx-hub/*.ts|rgfx-hub/*.tsx|rgfx-hub/*.js|rgfx-hub/*.jsx|rgfx-hub/*.json)
                HUB_CHANGES=true
                ;;
            esp32/*.cpp|esp32/*.h|esp32/*.c|esp32/*.ini)
                ESP32_CHANGES=true
                ;;
            public-docs/docs/*|public-docs/mkdocs.yml|public-docs/overrides/*|public-docs/requirements.txt)
                DOCS_CHANGES=true
                ;;
        esac
    done
}

if [ "$1" = "--all" ]; then
    # Force all checks
    HUB_CHANGES=true
    ESP32_CHANGES=true
    LUA_CHANGES=true
    DOCS_CHANGES=true
else
    # Get staged files (if any)
    STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")

    if [ -n "$STAGED_FILES" ]; then
        # Have staged files - use those
        classify_files "$STAGED_FILES"
    else
        # No staged files - check unstaged changes instead
        UNSTAGED_FILES=$(git diff --name-only 2>/dev/null || echo "")
        if [ -n "$UNSTAGED_FILES" ]; then
            echo "📋 No staged files, checking unstaged changes..."
            classify_files "$UNSTAGED_FILES"
        else
            # No changes at all
            echo "📄 No changes detected, nothing to check"
            exit 0
        fi
    fi
fi

# Check for unstaged CLAUDE.md files in directories with staged changes
# Returns 1 if unstaged CLAUDE.md files are found, 0 otherwise
check_claude_md_updates() {
    local staged_files="$1"
    local unstaged_claude_files=""
    local checked_dirs=""

    # Get list of staged CLAUDE.md files
    local staged_claude_files=$(echo "$staged_files" | grep "CLAUDE.md" || true)

    for file in $staged_files; do
        # Skip non-source files
        case "$file" in
            *.ts|*.tsx|*.js|*.jsx|*.cpp|*.h|*.lua|public-docs/docs/*|public-docs/mkdocs.yml|public-docs/overrides/*)
                ;;
            *)
                continue
                ;;
        esac

        # Get directory of the file
        local dir=$(dirname "$file")

        # Helper to check a CLAUDE.md and record if unstaged
        check_one_claude() {
            local claude_file="$1"
            if [ -f "$ROOT_DIR/$claude_file" ]; then
                if ! echo "$staged_claude_files" | grep -q "^${claude_file}$"; then
                    if ! echo "$unstaged_claude_files" | grep -q "^${claude_file}$"; then
                        unstaged_claude_files="$unstaged_claude_files
$claude_file"
                    fi
                fi
                return 0
            fi
            return 1
        }

        local found=false

        # Walk up directory tree looking for CLAUDE.md
        while [ "$dir" != "." ] && [ "$dir" != "/" ]; do
            # Skip if we already checked this directory
            if echo "$checked_dirs" | grep -q "^${dir}$"; then
                found=true
                break
            fi

            if check_one_claude "$dir/CLAUDE.md"; then
                checked_dirs="$checked_dirs
$dir"
                found=true
                break
            fi

            dir=$(dirname "$dir")
        done

        # Also check immediate child directories (handles cases like
        # public-docs/mkdocs.yml needing public-docs/docs/CLAUDE.md)
        if [ "$found" = false ]; then
            local file_dir=$(dirname "$file")
            for child_claude in "$ROOT_DIR/$file_dir"/*/CLAUDE.md; do
                [ -f "$child_claude" ] || continue
                local rel_path="${child_claude#$ROOT_DIR/}"
                check_one_claude "$rel_path"
                checked_dirs="$checked_dirs
$file_dir"
                break
            done
        fi
    done

    # Fail if any unstaged CLAUDE.md files found
    if [ -n "$(echo "$unstaged_claude_files" | tr -d '[:space:]')" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "❌ CLAUDE.md Update Required"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "The following CLAUDE.md files must be updated to reflect your changes:"
        echo "$unstaged_claude_files" | grep -v "^$" | while read -r f; do
            echo "  📝 $f"
        done
        echo ""
        echo "Update these files and stage them: git add <file>"
        echo ""
        return 1
    fi
    return 0
}

# Run CLAUDE.md check if we have staged files (required - fails build if not updated)
if [ -n "$STAGED_FILES" ]; then
    if ! check_claude_md_updates "$STAGED_FILES"; then
        exit 1
    fi
fi

# Check if any changes detected
if [ "$HUB_CHANGES" = false ] && [ "$ESP32_CHANGES" = false ] && [ "$LUA_CHANGES" = false ] && [ "$DOCS_CHANGES" = false ]; then
    echo "📄 No relevant changes detected, skipping checks"
    exit 0
fi

notify "Starting code checks..."
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

    # ts-unused-exports has a known Windows bug with barrel re-exports (issue #302)
    if [[ "$(uname -s)" != MINGW* && "$(uname -s)" != MSYS* && "$(uname -s)" != CYGWIN* ]]; then
        echo "🔍 Checking for unused exports..."
        npm run unused-exports
        echo "✅ No unused exports found"
    else
        echo "⏭️  Skipping unused exports check (known Windows bug in ts-unused-exports #302)"
    fi

    notify "Running Hub tests..."
    echo "🧪 Running tests..."
    npm test
    echo "✅ Tests passed"

    echo "📦 Checking for unused dependencies..."
    # Note: colord and d3-scale may be unused - audit separately
    # cross-env is used in npm scripts but depcheck doesn't detect that
    npx depcheck --ignores="@types/*,electron,@electron-forge/*,@testing-library/*,@vitest/*,depcheck,license-checker,sharp,png2icons,colord,d3-scale,@eslint/*,cross-env"
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
    pio run
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

# 4. Docs build
if [ "$DOCS_CHANGES" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📚 public-docs"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$ROOT_DIR"

    notify "Building docs..."
    echo "🔨 Building documentation..."
    npm run docs:build
    echo "✅ Docs built"

    # Auto-stage generated site if running as pre-commit (staged files present)
    if [ -n "$STAGED_FILES" ]; then
        echo "📎 Staging public-docs/site/..."
        git add public-docs/site/
    fi

    echo ""
fi

notify "All checks passed!"
echo "✨ All code quality checks passed!"
