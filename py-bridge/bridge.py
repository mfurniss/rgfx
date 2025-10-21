#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
RGFX Network Bridge
Tails the MAME events file and publishes events to network endpoints (UDP, MQTT) with low latency.
Displays events in a static terminal UI.
"""

import time
import sys
import tempfile
import curses
import json
from pathlib import Path
import paho.mqtt.client as mqtt
import socket
import colorsys
import random
from ui import BridgeUI

UDP_IP = "192.168.10.86"
UDP_PORT = 1234

# Create a single reusable UDP socket
udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)


def tail_file(filepath, ui):
    """
    Generator that yields new lines from a file as they are written.
    Handles file creation, rotation, and truncation.
    """
    filepath = Path(filepath)

    # Wait for file to exist
    while not filepath.exists():
        ui.set_status(f"Waiting for events file to be created...")
        time.sleep(1)

    ui.set_status("Reading events file")

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
                    ui.set_status("File truncated, seeking to beginning")
                    f.seek(0)


def run_bridge(stdscr, broker, port, eventsfile, qos):
    ui = BridgeUI(stdscr)
    ui.set_logfile(str(eventsfile))
    ui.set_status("UDP-only mode (MQTT disabled)")

    # MQTT DISABLED FOR UDP TESTING
    # # Create MQTT client with persistent connection
    # client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    #
    # def on_connect(client, userdata, flags, rc):
    #     if rc == 0:
    #         ui.set_status(f"Connected to {broker}:{port}")
    #     else:
    #         ui.set_status(f"Connection failed: {rc}")
    #
    # def on_disconnect(client, userdata, rc):
    #     if rc != 0:
    #         ui.set_status("Disconnected - reconnecting...")
    #
    # client.on_connect = on_connect
    # client.on_disconnect = on_disconnect
    #
    # try:
    #     client.connect(broker, port, 60)
    # except Exception as e:
    #     ui.set_status(f"Error: {e}")
    #     time.sleep(3)
    #     return
    #
    # # Start network loop in background thread
    # client.loop_start()

    try:
        for line in tail_file(eventsfile, ui):
            # Parse line: "topic message"
            parts = line.split(' ', 1)
            topic, message = parts
            # Display: use original topic for UI
            ui.add_message(topic, message)

            # Send UDP packet with effect and random color
            hue = random.random()  # 0.0 to 1.0
            rgb = colorsys.hls_to_rgb(hue, 0.5, 1.0)  # lightness=0.5, saturation=1.0
            hex_color = "{:02X}{:02X}{:02X}".format(int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255))

            payload = {
                "effect": "pulse",
                "color": hex_color
            }
            udp_sock.sendto(json.dumps(payload).encode(), (UDP_IP, UDP_PORT))
            ui.increment_sent()
           

    except KeyboardInterrupt:
        pass
    finally:
        # MQTT DISABLED FOR UDP TESTING
        # client.loop_stop()
        # client.disconnect()
        pass


def load_config(config_file=None):
    """Load configuration from JSON file, using defaults if not found"""
    # Default configuration
    config = {
        'broker': 'localhost',
        'port': 1883,
        'eventsfile': str(Path(tempfile.gettempdir()) / 'rgfx_events.log'),
        'qos': 0
    }

    # Determine config file path
    if config_file is None:
        config_path = Path('rgfx_network_bridge_config.json')
    else:
        config_path = Path(config_file)

    # Try to load config file
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                config.update(user_config)
        except Exception as e:
            print(f"Warning: Could not load {config_path}: {e}")
            print("Using default configuration")
    elif config_file is not None:
        # User specified a config file but it doesn't exist
        print(f"Error: Config file not found: {config_file}")
        sys.exit(1)

    return config


def main():
    # Parse config argument (format: config=my_config.json)
    config_file = None
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg.startswith('config='):
            config_file = arg.split('=', 1)[1]
        else:
            print("Usage: bridge.py [config=path/to/config.json]")
            sys.exit(1)

    config = load_config(config_file)

    try:
        curses.wrapper(run_bridge, config['broker'], config['port'],
                      config['eventsfile'], config['qos'])
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
