#!/bin/bash

# RGFX MAME Launcher
# Usage: ./launch-mame.sh <system_or_rom> [additional_args...]
# Examples:
#   ./launch-mame.sh pacman
#   ./launch-mame.sh galaga
#   ./launch-mame.sh nes -cart roms/smb.nes

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine the rgfx.lua path based on environment
# In development: rgfx-hub/assets/mame/rgfx.lua
# In production: RGFX Hub.app/Contents/Resources/mame/rgfx.lua

# Check if we're in the packaged app (production)
if [[ -d "$SCRIPT_DIR/../Resources/mame" ]]; then
    # Production: script is in Contents/MacOS or similar
    RGFX_LUA="$SCRIPT_DIR/../Resources/mame/rgfx.lua"
elif [[ -d "$SCRIPT_DIR/../rgfx-hub/assets/mame" ]]; then
    # Development: script is in project root scripts/
    RGFX_LUA="$SCRIPT_DIR/../rgfx-hub/assets/mame/rgfx.lua"
else
    echo "Error: Could not find rgfx.lua"
    echo "Expected locations:"
    echo "  Development: $SCRIPT_DIR/../rgfx-hub/assets/mame/rgfx.lua"
    echo "  Production:  $SCRIPT_DIR/../Resources/mame/rgfx.lua"
    exit 1
fi

# Verify rgfx.lua exists
if [[ ! -f "$RGFX_LUA" ]]; then
    echo "Error: rgfx.lua not found at: $RGFX_LUA"
    exit 1
fi

# Get absolute path for MAME
RGFX_LUA="$(cd "$(dirname "$RGFX_LUA")" && pwd)/$(basename "$RGFX_LUA")"

# Find MAME executable
if command -v mame &> /dev/null; then
    MAME_EXEC="$(command -v mame)"
    MAME_DIR="$(dirname "$MAME_EXEC")"
else
    echo "Error: 'mame' command not found in PATH"
    echo ""
    echo "Please install MAME and ensure it's in your PATH, or create a symlink:"
    echo "  ln -s /path/to/your/mame /usr/local/bin/mame"
    exit 1
fi

# Change to MAME home directory so relative paths in mame.ini (inp, snap, cfg, etc.) resolve here
cd "$HOME/.mame" || exit 1

# Parse ROM name from args (first non-flag argument)
ROM_NAME=""
for arg in "$@"; do
    if [[ ! "$arg" =~ ^- ]]; then
        ROM_NAME="$arg"
        break
    fi
done

# Parse cart name for console systems (-cart argument)
CART_NAME=""
NEXT_IS_CART=false
for arg in "$@"; do
    if $NEXT_IS_CART; then
        # Extract basename without extension from cart path
        CART_NAME=$(basename "$arg" | sed 's/\.[^.]*$//')
        break
    fi
    if [[ "$arg" == "-cart" || "$arg" == "-cartridge" ]]; then
        NEXT_IS_CART=true
    fi
done

# Use cart name if available (console), otherwise ROM name (arcade)
GAME_NAME="${CART_NAME:-$ROM_NAME}"
EVENT_LOG="$HOME/.rgfx/interceptor-events.log"

echo "RGFX MAME Launcher"
echo "  MAME: $MAME_EXEC"
echo "  RGFX: $RGFX_LUA"
echo "  Game: $GAME_NAME"
echo ""

# Run MAME with autoboot script using absolute path to the script
# Vector settings loaded from ~/.mame/vector.ini (requires -video opengl)
"$MAME_EXEC" "$@" \
  -rompath ~/mame-roms \
  -pluginspath "$MAME_DIR/plugins" \
  -window -nomaximize -skip_gameinfo \
  -video bgfx \
  -autoboot_script "$RGFX_LUA"
MAME_EXIT_CODE=$?

# Emit shutdown event after MAME exits (catches all exit methods: quit, crash, force quit)
if [[ -n "$GAME_NAME" ]]; then
    printf '%s\n' "rgfx/mame-exit $GAME_NAME" >> "$EVENT_LOG"
else
    printf '%s\n' "rgfx/mame-exit unknown" >> "$EVENT_LOG"
fi

exit $MAME_EXIT_CODE
