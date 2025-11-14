#!/bin/bash
set -e

cd "$(dirname "$0")"

# Find all connected ESP32 devices
PORTS=$(pio device list --serial | grep -E '/dev/cu\.usbserial' | awk '{print $1}')

if [ -z "$PORTS" ]; then
    echo "❌ No ESP32 devices found on USB"
    exit 1
fi

# Convert to array for indexing
PORTS_ARRAY=($PORTS)

echo "Found ${#PORTS_ARRAY[@]} device(s):"
for port in "${PORTS_ARRAY[@]}"; do
    echo "  - $port"
done
echo ""

# Build firmware once
echo "Building firmware..."
pio run
echo ""

# Launch uploads in parallel
echo "Uploading to all devices in parallel..."
pids=()
for PORT in "${PORTS_ARRAY[@]}"; do
    echo "Starting upload to $PORT..."
    pio run -t nobuild -t upload --upload-port "$PORT" &
    pids+=($!)
done

# Wait for all processes and track failures
failed_devices=()
success_count=0

for i in "${!pids[@]}"; do
    if wait "${pids[$i]}"; then
        ((success_count++))
    else
        failed_devices+=("${PORTS_ARRAY[$i]}")
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
