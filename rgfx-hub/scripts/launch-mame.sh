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
elif [[ -d "$SCRIPT_DIR/../assets/mame" ]]; then
    # Development: script is in rgfx-hub/scripts
    RGFX_LUA="$SCRIPT_DIR/../assets/mame/rgfx.lua"
else
    echo "Error: Could not find rgfx.lua"
    echo "Expected locations:"
    echo "  Development: $SCRIPT_DIR/../assets/mame/rgfx.lua"
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

# Change to MAME directory (required for plugins to load)
cd "$MAME_DIR" || exit 1

echo "RGFX MAME Launcher"
echo "  MAME: $MAME_EXEC"
echo "  RGFX: $RGFX_LUA"
echo ""

# Run MAME with autoboot script using absolute path to the script
# Vector brightness settings (beam options require OpenGL, not BGFX)
"$MAME_EXEC" "$@" -rompath ~/mame-roms -window -nomaximize -skip_gameinfo -video opengl -joystick_deadzone 0.1 -beam_width_min 3.0 -beam_width_max 8.0 -beam_intensity_weight 1.0 -flicker 0 -autoboot_script "$RGFX_LUA"
