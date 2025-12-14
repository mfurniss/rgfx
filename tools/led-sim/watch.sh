#!/bin/bash
# Watch mode for LED Simulator
# Recompiles and relaunches on source file changes

CONFIG_FILE="${1:-$HOME/.rgfx/led-hardware/virtual-strip.json}"
BUILD_DIR="$(dirname "$0")/build"
SIM_PID=""

cleanup() {
    if [ -n "$SIM_PID" ] && kill -0 "$SIM_PID" 2>/dev/null; then
        kill "$SIM_PID" 2>/dev/null
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

build_and_run() {
    # Kill previous instance
    if [ -n "$SIM_PID" ] && kill -0 "$SIM_PID" 2>/dev/null; then
        kill "$SIM_PID" 2>/dev/null
        wait "$SIM_PID" 2>/dev/null
    fi

    echo ""
    echo "=== Building... ==="
    if make -C "$BUILD_DIR" -j4 2>&1; then
        echo "=== Launching led-sim ==="
        "$BUILD_DIR/led-sim" "$CONFIG_FILE" &
        SIM_PID=$!
    else
        echo "=== Build failed ==="
    fi
}

# Check for fswatch
if ! command -v fswatch &> /dev/null; then
    echo "Error: fswatch not found. Install with: brew install fswatch"
    exit 1
fi

echo "LED Simulator Watch Mode"
echo "Config: $CONFIG_FILE"
echo "Watching: src/, ../../esp32/src/effects/, ../../esp32/src/graphics/"
echo "Press Ctrl+C to quit"
echo ""

# Initial build and run
build_and_run

# Watch for changes
fswatch -o \
    "$(dirname "$0")/src" \
    "$(dirname "$0")/../../esp32/src/effects" \
    "$(dirname "$0")/../../esp32/src/graphics" \
    | while read -r; do
    build_and_run
done
