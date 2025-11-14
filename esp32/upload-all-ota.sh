#!/bin/bash
set -e

cd "$(dirname "$0")"

# Known devices (add more as needed)
DEVICES=(
    "rgfx-driver-f89a58.local"
    "rgfx-driver-f8cf68.local"
)

echo "Uploading firmware via OTA to ${#DEVICES[@]} device(s):"
for device in "${DEVICES[@]}"; do
    echo "  - $device"
done
echo ""

# Build firmware once
echo "Building firmware..."
pio run
echo ""

# Launch uploads in parallel
echo "Uploading to all devices in parallel..."
pids=()
for device in "${DEVICES[@]}"; do
    echo "Starting upload to $device..."
    pio run -t nobuild -t upload --upload-port "$device" &
    pids+=($!)
done

# Wait for all processes and track failures
failed_devices=()
success_count=0

for i in "${!pids[@]}"; do
    if wait "${pids[$i]}"; then
        ((success_count++))
    else
        failed_devices+=("${DEVICES[$i]}")
    fi
done

echo ""

# Report results
if [ ${#failed_devices[@]} -eq 0 ]; then
    echo "✅ All $success_count device(s) updated successfully!"
    exit 0
else
    echo "❌ Upload failed for ${#failed_devices[@]} device(s):"
    for device in "${failed_devices[@]}"; do
        echo "  - $device"
    done
    echo "✅ $success_count device(s) succeeded"
    exit 1
fi
