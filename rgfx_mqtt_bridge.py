#!/usr/bin/env python3
"""
RGFX MQTT Bridge
Tails the MAME log file and publishes events to MQTT broker with low latency.
"""

import time
import argparse
import sys
from pathlib import Path
import paho.mqtt.client as mqtt


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT broker")
    else:
        print(f"Failed to connect, return code {rc}")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        print("Unexpected disconnect, reconnecting...")


def tail_file(filepath):
    """
    Generator that yields new lines from a file as they are written.
    Handles file creation, rotation, and truncation.
    """
    filepath = Path(filepath)

    # Wait for file to exist
    while not filepath.exists():
        print(f"Waiting for {filepath} to be created...")
        time.sleep(1)

    with open(filepath, 'r') as f:
        # Start at the end of the file
        f.seek(0, 2)

        while True:
            line = f.readline()
            if line:
                yield line.rstrip('\n')
            else:
                # No new data, sleep briefly
                time.sleep(0.01)  # 10ms polling for low latency

                # Check if file was truncated or rotated
                current_size = filepath.stat().st_size
                if current_size < f.tell():
                    print("File truncated, seeking to beginning")
                    f.seek(0)


def main():
    parser = argparse.ArgumentParser(description='RGFX MQTT Bridge')
    parser.add_argument('--broker', default='localhost', help='MQTT broker host (default: localhost)')
    parser.add_argument('--port', type=int, default=1883, help='MQTT broker port (default: 1883)')
    parser.add_argument('--logfile', default='/tmp/mame_out.txt', help='Path to MAME log file (default: /tmp/mame_out.txt)')
    parser.add_argument('--qos', type=int, default=0, choices=[0, 1, 2], help='MQTT QoS level (default: 0)')

    args = parser.parse_args()

    # Create MQTT client with persistent connection
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    print(f"Connecting to MQTT broker at {args.broker}:{args.port}...")
    try:
        client.connect(args.broker, args.port, 60)
    except Exception as e:
        print(f"Error connecting to broker: {e}")
        sys.exit(1)

    # Start network loop in background thread
    client.loop_start()

    print(f"Tailing log file: {args.logfile}")
    print("Bridge running. Press Ctrl+C to exit.")

    try:
        for line in tail_file(args.logfile):
            # Parse line: "topic message"
            parts = line.split(' ', 1)
            if len(parts) == 2:
                topic, message = parts
                # Publish with low latency
                result = client.publish(topic, message, qos=args.qos)
                if result.rc != mqtt.MQTT_ERR_SUCCESS:
                    print(f"Failed to publish: {topic} {message}")
            elif len(parts) == 1 and parts[0]:
                # Topic with no message
                topic = parts[0]
                client.publish(topic, "", qos=args.qos)
            # Ignore empty lines

    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        client.loop_stop()
        client.disconnect()
        print("Disconnected from MQTT broker")


if __name__ == '__main__':
    main()
