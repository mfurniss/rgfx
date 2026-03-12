#!/bin/bash

# RGFX MAME Launcher
# Usage: ./launch-mame.sh <system_or_rom> [additional_args...]
# Examples:
#   ./launch-mame.sh pacman
#   ./launch-mame.sh galaga
#   ./launch-mame.sh nes -cart roms/smb.nes

# --- Configurable paths (edit these to customize) ---
RGFX_LUA_PATH="{{RGFX_LUA_PATH}}"
ROM_PATH="{{ROM_PATH}}"
# Leave empty to auto-detect MAME from common locations and PATH
MAME_PATH=""

# Verify rgfx.lua exists
if [[ ! -f "$RGFX_LUA_PATH" ]]; then
    echo "Error: rgfx.lua not found at: $RGFX_LUA_PATH"
    echo "Edit this script to set the correct RGFX_LUA_PATH."
    exit 1
fi

# Find MAME executable
if [[ -n "$MAME_PATH" ]]; then
    MAME_EXEC="$MAME_PATH"
else
    # Auto-detect MAME from common locations, then PATH
    MAME_EXEC=""
    if [[ -x "$HOME/mame/mame" ]]; then
        MAME_EXEC="$HOME/mame/mame"
    elif [[ -x "/opt/homebrew/bin/mame" ]]; then
        MAME_EXEC="/opt/homebrew/bin/mame"
    elif [[ -x "/usr/local/bin/mame" ]]; then
        MAME_EXEC="/usr/local/bin/mame"
    elif command -v mame &> /dev/null; then
        MAME_EXEC="$(command -v mame)"
    fi
fi

if [[ -z "$MAME_EXEC" ]]; then
    echo "Error: MAME not found"
    echo ""
    echo "Checked locations:"
    echo "  - $HOME/mame/mame"
    echo "  - /opt/homebrew/bin/mame"
    echo "  - /usr/local/bin/mame"
    echo "  - PATH"
    echo ""
    echo "Set MAME_PATH in this script or install MAME to one of these locations."
    exit 1
fi

# Change to MAME home directory so relative paths in mame.ini (inp, snap, cfg, etc.) resolve here
mkdir -p "$HOME/.mame"
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
echo "  RGFX: $RGFX_LUA_PATH"
echo "  Game: $GAME_NAME"
echo ""

# Run MAME with autoboot script
"$MAME_EXEC" "$@" \
  -rompath "$ROM_PATH" \
  -skip_gameinfo \
  -autoboot_script "$RGFX_LUA_PATH"
MAME_EXIT_CODE=$?

# Emit shutdown event after MAME exits (catches all exit methods: quit, crash, force quit)
mkdir -p "$(dirname "$EVENT_LOG")"
if [[ -n "$GAME_NAME" ]]; then
    printf '%s\n' "rgfx/mame-exit $GAME_NAME" >> "$EVENT_LOG"
else
    printf '%s\n' "rgfx/mame-exit unknown" >> "$EVENT_LOG"
fi

exit $MAME_EXIT_CODE
