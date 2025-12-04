#!/bin/bash

# Usage: ./launch.sh <system_or_rom> [additional_args...]
# Examples:
#   ./launch.sh pacman
#   ./launch.sh galaga
#   ./launch.sh nes -cart roms/smb.nes

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Run MAME with autoboot script using absolute path to the script
# Vector brightness settings (beam options require OpenGL, not BGFX)
"$MAME_EXEC" "$@" -rompath ~/mame-roms -window -nomaximize -skip_gameinfo -video opengl -joystick_deadzone 0.1 -beam_width_min 3.0 -beam_width_max 8.0 -beam_intensity_weight 1.0 -flicker 0 -autoboot_script "${SCRIPT_DIR}/lua/rgfx.lua"
