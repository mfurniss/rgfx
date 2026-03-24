#!/bin/bash
# Single source of truth for all code quality checks and tests
# Runs checks for: rgfx-hub (TypeScript), esp32 (PlatformIO), mame (Lua), docs
#
# Usage:
#   ./test-code.sh              # Auto-detect changes, run relevant checks
#   ./test-code.sh all          # Run all checks for all projects
#   ./test-code.sh hub          # All hub checks (audit, typecheck, lint, unused exports, tests, depcheck, licenses)
#   ./test-code.sh esp32        # All esp32 checks (build + tests)
#   ./test-code.sh lua          # Lua checks (luacheck)
#   ./test-code.sh docs         # Docs build
#   ./test-code.sh vitest       # Hub unit tests only (vitest)
#   ./test-code.sh lint         # Hub lint only (eslint)
#   ./test-code.sh typecheck    # Hub typecheck only (tsc)

set -e

# Fix PlatformIO Unicode output on Windows (cp1252 can't encode checkmarks)
export PYTHONIOENCODING=utf-8

ROOT_DIR="$(git rev-parse --show-toplevel)"

# Cross-platform notification helper
# macOS: brew install terminal-notifier
# Windows: uses native Toast API (no install required)
notify() {
    case "$(uname -s)" in
        Darwin)
            terminal-notifier -title "RGFX Tests" -message "$1" 2>/dev/null || true
            ;;
        MINGW*|MSYS*|CYGWIN*)
            powershell.exe -Command "
                [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
                [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
                \$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText01)
                \$xml.GetElementsByTagName('text').Item(0).InnerText = '$1'
                \$toast = [Windows.UI.Notifications.ToastNotification]::new(\$xml)
                [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('RGFX Tests').Show(\$toast)
            " 2>/dev/null || true
            ;;
    esac
}

# Notify on failure
trap 'notify "Code checks failed!"' ERR

# --- Individual check functions ---

run_hub_audit() {
    notify "Checking dependencies..."
    echo "🔒 Checking for dependency vulnerabilities..."
    AUDIT_OUTPUT=$(npm audit --prefix "$ROOT_DIR/rgfx-hub" --audit-level=critical 2>&1) || {
        echo "$AUDIT_OUTPUT"
        exit 1
    }
    echo "✅ No critical vulnerabilities found"
}

run_hub_typecheck() {
    notify "TypeScript type checking..."
    echo "📝 TypeScript type checking..."
    npm run typecheck --prefix "$ROOT_DIR/rgfx-hub"
    echo "✅ TypeScript passed"
}

run_hub_lint() {
    notify "Running ESLint..."
    echo "🔧 Running ESLint..."
    npm run lint --prefix "$ROOT_DIR/rgfx-hub"
    echo "✅ ESLint passed"
}

run_hub_unused_exports() {
    # ts-unused-exports has a known Windows bug with barrel re-exports (issue #302)
    if [[ "$(uname -s)" != MINGW* && "$(uname -s)" != MSYS* && "$(uname -s)" != CYGWIN* ]]; then
        echo "🔍 Checking for unused exports..."
        npm run unused-exports --prefix "$ROOT_DIR/rgfx-hub"
        echo "✅ No unused exports found"
    else
        echo "⏭️  Skipping unused exports check (known Windows bug in ts-unused-exports #302)"
    fi
}

run_hub_vitest() {
    notify "Running Hub tests..."
    echo "🧪 Running tests..."
    npm test --prefix "$ROOT_DIR/rgfx-hub" -- "${EXTRA_ARGS[@]}"
    echo "✅ Tests passed"
}

run_hub_depcheck() {
    echo "📦 Checking for unused dependencies..."
    npm run depcheck --prefix "$ROOT_DIR/rgfx-hub"
    echo "✅ No unused dependencies found"
}

run_hub_license_check() {
    echo "📜 Checking dependency licenses..."
    LICENSE_OUTPUT=$(npm run license-check --prefix "$ROOT_DIR/rgfx-hub" 2>&1) || {
        echo "$LICENSE_OUTPUT"
        exit 1
    }
    echo "✅ All licenses are permissive"
}

run_hub_all() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 rgfx-hub"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    run_hub_audit
    run_hub_typecheck
    run_hub_lint
    run_hub_unused_exports
    run_hub_vitest
    run_hub_depcheck
    run_hub_license_check
    echo ""
}

run_esp32_all() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔌 esp32"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    notify "Building ESP32 firmware..."
    echo "🔨 Building esp32 firmware..."
    pio run -d "$ROOT_DIR/esp32"
    echo "✅ esp32 build passed"

    notify "Running ESP32 tests..."
    echo "🧪 Running esp32 tests..."
    # Show suite-level results only; full detail on failure
    PIO_TEST_OUTPUT=$(pio test -e native -d "$ROOT_DIR/esp32" 2>&1) || {
        echo "$PIO_TEST_OUTPUT"
        exit 1
    }
    echo "$PIO_TEST_OUTPUT" | grep -E "^-.*\[(PASSED|FAILED)\]|^=.*="
    echo "✅ esp32 tests passed"
    echo ""
}

run_lua_all() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎮 mame lua scripts"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    notify "Running Lua checks..."
    echo "🔍 Running luacheck..."
    luacheck "$ROOT_DIR/rgfx-hub/assets/mame/"*.lua
    echo "✅ Lua checks passed"
    echo ""
}

run_docs_all() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📚 public-docs"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    notify "Building docs..."
    echo "🔨 Building documentation..."
    npm run docs:build --prefix "$ROOT_DIR"
    echo "✅ Docs built"
    echo ""
}

# --- CLAUDE.md check (for pre-commit) ---

# Check if staged changes to a file are formatting-only (trailing commas,
# semicolons, whitespace). Returns 0 if formatting-only, 1 if substantive.
is_formatting_only() {
    local file="$1"
    local removed added
    removed=$(git diff --cached -- "$file" | grep "^-[^-]" | sed 's/^-//; s/[,;]*[[:space:]]*$//')
    added=$(git diff --cached -- "$file" | grep "^+[^+]" | sed 's/^+//; s/[,;]*[[:space:]]*$//')
    [ "$removed" = "$added" ]
}

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

        # Skip files with formatting-only changes (trailing commas, whitespace)
        if is_formatting_only "$file"; then
            continue
        fi

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

# --- Auto-detect changes ---

auto_detect() {
    local HUB_CHANGES=false
    local ESP32_CHANGES=false
    local LUA_CHANGES=false
    local DOCS_CHANGES=false

    # Helper function to classify files and set change flags
    classify_files() {
        local files="$1"
        for file in $files; do
            case "$file" in
                rgfx-hub/assets/mame/*.lua|rgfx-hub/assets/interceptors/*.lua)
                    LUA_CHANGES=true
                    ;;
                package.json|rgfx-hub/package.json)
                    HUB_CHANGES=true
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

    # Get staged files (if any)
    STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")

    if [ -n "$STAGED_FILES" ]; then
        classify_files "$STAGED_FILES"

        # Check for unstaged CLAUDE.md files
        if ! check_claude_md_updates "$STAGED_FILES"; then
            exit 1
        fi
    else
        # No staged files - check unstaged changes instead
        UNSTAGED_FILES=$(git diff --name-only 2>/dev/null || echo "")
        if [ -n "$UNSTAGED_FILES" ]; then
            echo "📋 No staged files, checking unstaged changes..."
            classify_files "$UNSTAGED_FILES"
        else
            echo "📄 No changes detected, nothing to check"
            exit 0
        fi
    fi

    if [ "$HUB_CHANGES" = false ] && [ "$ESP32_CHANGES" = false ] && [ "$LUA_CHANGES" = false ] && [ "$DOCS_CHANGES" = false ]; then
        echo "📄 No relevant changes detected, skipping checks"
        exit 0
    fi

    notify "Starting code checks..."
    echo "🔍 Running code quality checks..."
    echo ""

    if [ "$HUB_CHANGES" = true ]; then run_hub_all; fi
    if [ "$ESP32_CHANGES" = true ]; then run_esp32_all; fi
    if [ "$LUA_CHANGES" = true ]; then run_lua_all; fi
    if [ "$DOCS_CHANGES" = true ]; then run_docs_all; fi
}

# --- Main ---

# Extra args (everything after the subcommand) are passed through to the underlying tool
EXTRA_ARGS=("${@:2}")

case "${1:-}" in
    all)
        notify "Starting code checks..."
        echo "🔍 Running all code quality checks..."
        echo ""
        run_hub_all
        run_esp32_all
        run_lua_all
        run_docs_all
        ;;
    hub)
        notify "Starting hub checks..."
        echo "🔍 Running hub code quality checks..."
        echo ""
        run_hub_all
        ;;
    esp32)
        notify "Starting esp32 checks..."
        echo "🔍 Running esp32 checks..."
        echo ""
        run_esp32_all
        ;;
    lua)
        notify "Starting lua checks..."
        echo "🔍 Running lua checks..."
        echo ""
        run_lua_all
        ;;
    docs)
        run_docs_all
        ;;
    vitest)
        run_hub_vitest
        ;;
    lint)
        run_hub_lint
        ;;
    typecheck)
        run_hub_typecheck
        ;;
    "")
        auto_detect
        ;;
    *)
        echo "Usage: test-code.sh [command]"
        echo ""
        echo "Commands:"
        echo "  (none)      Auto-detect changes and run relevant checks"
        echo "  all         Run all checks for all projects"
        echo "  hub         All hub checks (audit, typecheck, lint, tests, depcheck, licenses)"
        echo "  esp32       All esp32 checks (build + tests)"
        echo "  lua         Lua checks (luacheck)"
        echo "  docs        Docs build"
        echo "  vitest      Hub unit tests only (vitest)"
        echo "  lint        Hub lint only (eslint)"
        echo "  typecheck   Hub typecheck only (tsc)"
        exit 1
        ;;
esac

notify "All checks passed!"
echo "✨ All checks passed!"
