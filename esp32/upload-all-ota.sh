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

# Upload to each device sequentially
for device in "${DEVICES[@]}"; do
    echo ""
    echo "=== Uploading to $device ==="
    pio run -t nobuild -t upload --upload-port "$device"
done

echo ""
echo "✅ All devices updated successfully!"
