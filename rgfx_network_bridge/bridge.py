#!/usr/bin/env python3
"""
RGFX Network Bridge
Tails the MAME log file and publishes events to network endpoints (UDP, MQTT) with low latency.
Displays events in a static terminal UI.
"""

import time
import argparse
import sys
import tempfile
import curses
from pathlib import Path
import paho.mqtt.client as mqtt
import logging
import socket
import colorsys
import random
from ui import BridgeUI

UDP_IP = "192.168.30.146"
UDP_PORT = 1234

# Create a single reusable UDP socket
udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)


def tail_file(filepath, ui):
    """
    Generator that yields new lines from a file as they are written.
    Handles file creation, rotation, and truncation.
    Yields None when no data to allow checking for keyboard input.
    """
    filepath = Path(filepath)

    # Wait for file to exist
    while not filepath.exists():
        ui.set_status(f"Waiting for log file to be created...")
        time.sleep(1)
        yield None  # Allow checking for input while waiting

    ui.set_status("Reading log file")

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
                yield None  # Allow checking for input while waiting

                # Check if file was truncated or rotated
                current_size = filepath.stat().st_size
                if current_size < f.tell():
                    ui.set_status("File truncated, seeking to beginning")
                    f.seek(0)


def run_bridge(stdscr, broker, port, logfile, qos):
    ui = BridgeUI(stdscr)
    ui.set_logfile(str(logfile))
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
        for line in tail_file(logfile, ui):
            # Check for quit command
            if ui.check_input():
                break

            # Skip None values (just for checking input)
            if line is None:
                continue

            # Parse line: "topic message"
            parts = line.split(' ', 1)
            if len(parts) == 2:
                topic, message = parts
                # Display: use original topic for UI
                ui.add_message(topic, message)
                # MQTT DISABLED FOR UDP TESTING
                # client.publish("rgfx/test", message, qos=qos)
                # Send UDP packet with random HSL color (random hue, full saturation and lightness)
                hue = random.random()  # 0.0 to 1.0
                rgb = colorsys.hls_to_rgb(hue, 0.5, 1.0)  # lightness=0.5, saturation=1.0
                hex_color = "{:02X}{:02X}{:02X}".format(int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255))
                udp_sock.sendto(hex_color.encode(), (UDP_IP, UDP_PORT))
                epoch_time = time.time()
                logging.info(f"UDP {epoch_time}")
                ui.increment_sent()
            elif len(parts) == 1 and parts[0]:
                # Topic with no message (shouldn't happen but handle it)
                topic = parts[0]
                ui.add_message(topic, "")
                # MQTT DISABLED FOR UDP TESTING
                # client.publish("rgfx/test", "", qos=qos)
                # Send UDP packet using the shared socket
                udp_sock.sendto("FF0000".encode(), (UDP_IP, UDP_PORT))
                epoch_time = time.time()
                logging.info(f"UDP {epoch_time}")
                ui.increment_sent()

    except KeyboardInterrupt:
        pass
    finally:
        # MQTT DISABLED FOR UDP TESTING
        # client.loop_stop()
        # client.disconnect()
        pass


def main():
    # Default log file in OS temp directory
    default_logfile = Path(tempfile.gettempdir()) / 'rgfx_events.log'

    parser = argparse.ArgumentParser(description='RGFX Network Bridge')
    parser.add_argument('--broker', default='localhost', help='MQTT broker host (default: localhost)')
    parser.add_argument('--port', type=int, default=1883, help='MQTT broker port (default: 1883)')
    parser.add_argument('--logfile', default=str(default_logfile), help=f'Path to RGFX events log file (default: {default_logfile})')
    parser.add_argument('--qos', type=int, default=0, choices=[0, 1, 2], help='MQTT QoS level (default: 0)')

    args = parser.parse_args()

    # Setup logging to file with epoch timestamps
    log_path = Path(tempfile.gettempdir()) / 'rgfx_mqtt_bridge.log'
    logging.basicConfig(
        filename=str(log_path),
        level=logging.INFO,
        format='%(message)s'
    )

    try:
        curses.wrapper(run_bridge, args.broker, args.port, args.logfile, args.qos)
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
