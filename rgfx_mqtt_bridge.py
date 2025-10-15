#!/usr/bin/env python3
"""
RGFX MQTT Bridge
Tails the MAME log file and publishes events to MQTT broker with low latency.
Displays events in a static terminal UI.
"""

import time
import argparse
import sys
import tempfile
import curses
from datetime import datetime
from collections import OrderedDict
from pathlib import Path
import paho.mqtt.client as mqtt
import logging


class BridgeUI:
    def __init__(self, stdscr):
        self.stdscr = stdscr
        self.topics = OrderedDict()  # topic -> (message, timestamp)
        self.status = "Starting..."
        self.message_count = 0
        self.sent_count = 0
        self.logfile_path = ""

        # Setup curses
        curses.curs_set(0)  # Hide cursor
        self.stdscr.nodelay(True)  # Non-blocking input

        # Setup colors
        curses.start_color()
        curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)  # Header
        curses.init_pair(2, curses.COLOR_CYAN, curses.COLOR_BLACK)   # Topic
        curses.init_pair(3, curses.COLOR_YELLOW, curses.COLOR_BLACK) # Message
        curses.init_pair(4, curses.COLOR_WHITE, curses.COLOR_BLACK)  # Timestamp

    def set_status(self, status):
        self.status = status
        self.render()

    def set_logfile(self, path):
        self.logfile_path = path
        self.render()

    def add_message(self, topic, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        # Format: topic="rgfx/event/player_one_score" message="1000"
        self.topics[topic] = (message, timestamp)
        self.message_count += 1
        self.render()

    def increment_sent(self):
        self.sent_count += 1
        self.render()

    def render(self):
        try:
            self.stdscr.clear()
            height, width = self.stdscr.getmaxyx()

            # Header
            title = "RGFX MQTT Bridge"
            self.stdscr.addstr(0, (width - len(title)) // 2, title,
                              curses.color_pair(1) | curses.A_BOLD)

            # Status line
            status_line = f"Status: {self.status} | Received: {self.message_count} | Sent: {self.sent_count} | Topics: {len(self.topics)}"
            self.stdscr.addstr(1, 0, status_line[:width-1])

            # Log file info
            if self.logfile_path:
                log_line = f"Log file: {self.logfile_path}"
                self.stdscr.addstr(2, 0, log_line[:width-1], curses.color_pair(4))

            # Separator
            self.stdscr.addstr(3, 0, "─" * (width - 1))

            # Column headers
            header = f"{'TOPIC':<40} {'MESSAGE':<30} {'TIME':<8}"
            self.stdscr.addstr(4, 0, header[:width-1], curses.A_BOLD)

            # Topics and messages
            row = 5
            max_rows = height - 7  # Leave room for header and footer

            # Sort topics alphabetically
            topics_list = sorted(self.topics.items())
            for topic, (message, timestamp) in topics_list[:max_rows]:
                if row >= height - 2:
                    break

                # Truncate long values to fit screen
                topic_display = topic[:39]
                message_display = message[:29]

                try:
                    self.stdscr.addstr(row, 0, topic_display, curses.color_pair(2))
                    self.stdscr.addstr(row, 41, message_display, curses.color_pair(3))
                    self.stdscr.addstr(row, 72, timestamp, curses.color_pair(4))
                except curses.error:
                    pass  # Ignore errors from writing at edge of screen

                row += 1

            # Footer
            footer = "Press 'q' to quit | 'c' to clear"
            try:
                self.stdscr.addstr(height - 1, 0, footer[:width-1],
                                  curses.color_pair(1))
            except curses.error:
                pass

            self.stdscr.refresh()
        except Exception:
            pass  # Ignore render errors

    def check_input(self):
        """Check for keyboard input, returns True if should quit"""
        key = self.stdscr.getch()
        if key == ord('q') or key == ord('Q'):
            return True
        elif key == ord('c') or key == ord('C'):
            self.topics.clear()
            self.message_count = 0
            self.sent_count = 0
            self.render()
        return False


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
    ui.set_status("Connecting to MQTT broker...")

    # Create MQTT client with persistent connection
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            ui.set_status(f"Connected to {broker}:{port}")
        else:
            ui.set_status(f"Connection failed: {rc}")

    def on_disconnect(client, userdata, rc):
        if rc != 0:
            ui.set_status("Disconnected - reconnecting...")

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    try:
        client.connect(broker, port, 60)
    except Exception as e:
        ui.set_status(f"Error: {e}")
        time.sleep(3)
        return

    # Start network loop in background thread
    client.loop_start()

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
                # Publish test message for any detected event
                client.publish("rgfx/test", message, qos=qos)
                epoch_time = time.time()
                logging.info(f"rgfx/test {epoch_time}")
                ui.increment_sent()
            elif len(parts) == 1 and parts[0]:
                # Topic with no message (shouldn't happen but handle it)
                topic = parts[0]
                ui.add_message(topic, "")
                client.publish("rgfx/test", "", qos=qos)
                epoch_time = time.time()
                logging.info(f"rgfx/test {epoch_time}")
                ui.increment_sent()

    except KeyboardInterrupt:
        pass
    finally:
        client.loop_stop()
        client.disconnect()


def main():
    # Default log file in OS temp directory
    default_logfile = Path(tempfile.gettempdir()) / 'rgfx_events.log'

    parser = argparse.ArgumentParser(description='RGFX MQTT Bridge')
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
