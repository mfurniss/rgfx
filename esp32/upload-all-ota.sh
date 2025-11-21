#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Discovering RGFX drivers via mDNS..."

# Use dns-sd to discover all Arduino OTA devices for 3 seconds
# macOS doesn't have timeout, so use background process + sleep + kill
TMPFILE=$(mktemp)
dns-sd -B _arduino._tcp local. 2>/dev/null > "$TMPFILE" & DNSPID=$!

sleep 3
kill $DNSPID 2>/dev/null || true
wait $DNSPID 2>/dev/null || true

# Parse discovered devices from temp file
DEVICES=()
while IFS= read -r line; do
    # Extract hostname from dns-sd output
    # Format: "Timestamp A/R Flags if Domain Service Type Instance Name"
    # We want lines with "Add" and instance name starting with "rgfx-driver-"
    if [[ "$line" =~ [[:space:]](rgfx-driver-.*)$ ]]; then
        hostname="${BASH_REMATCH[1]}.local"
        DEVICES+=("$hostname")
    fi
done < "$TMPFILE"

rm -f "$TMPFILE"

if [ ${#DEVICES[@]} -eq 0 ]; then
    echo "❌ No RGFX drivers found on network!"
    echo "Make sure drivers are powered on and connected to WiFi."
    exit 1
fi

echo "Found ${#DEVICES[@]} driver(s):"
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
