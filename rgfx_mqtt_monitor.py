#!/usr/bin/env python3
"""
RGFX MQTT Monitor
Displays MQTT events in a static terminal UI showing latest values for each topic.
"""

import curses
import argparse
import sys
import time
from datetime import datetime
from collections import OrderedDict
import paho.mqtt.client as mqtt


class MQTTMonitor:
    def __init__(self, stdscr, broker, port, topic_pattern):
        self.stdscr = stdscr
        self.broker = broker
        self.port = port
        self.topic_pattern = topic_pattern
        self.topics = OrderedDict()  # topic -> (message, timestamp)
        self.status = "Connecting..."
        self.message_count = 0

        # Setup curses
        curses.curs_set(0)  # Hide cursor
        self.stdscr.nodelay(True)  # Non-blocking input

        # Setup colors
        curses.start_color()
        curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)  # Header
        curses.init_pair(2, curses.COLOR_CYAN, curses.COLOR_BLACK)   # Topic
        curses.init_pair(3, curses.COLOR_YELLOW, curses.COLOR_BLACK) # Message
        curses.init_pair(4, curses.COLOR_WHITE, curses.COLOR_BLACK)  # Timestamp

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.status = f"Connected to {self.broker}:{self.port}"
            client.subscribe(self.topic_pattern)
        else:
            self.status = f"Connection failed: {rc}"
        self.render()

    def on_disconnect(self, client, userdata, rc):
        self.status = "Disconnected - reconnecting..."
        self.render()

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        message = msg.payload.decode('utf-8', errors='replace')
        timestamp = datetime.now().strftime("%H:%M:%S")

        self.topics[topic] = (message, timestamp)
        self.message_count += 1
        self.render()

    def render(self):
        self.stdscr.clear()
        height, width = self.stdscr.getmaxyx()

        # Header
        title = "RGFX MQTT Monitor"
        self.stdscr.addstr(0, (width - len(title)) // 2, title,
                          curses.color_pair(1) | curses.A_BOLD)

        # Status line
        status_line = f"Status: {self.status} | Messages: {self.message_count} | Topics: {len(self.topics)}"
        self.stdscr.addstr(1, 0, status_line[:width-1])

        # Subscription info
        sub_line = f"Subscribed to: {self.topic_pattern}"
        self.stdscr.addstr(2, 0, sub_line[:width-1], curses.color_pair(4))

        # Separator
        self.stdscr.addstr(3, 0, "─" * (width - 1))

        # Column headers
        header = f"{'TOPIC':<40} {'MESSAGE':<30} {'TIME':<8}"
        self.stdscr.addstr(4, 0, header[:width-1], curses.A_BOLD)

        # Topics and messages
        row = 5
        max_rows = height - 7  # Leave room for header and footer

        # Show most recent topics (reverse order to show latest first)
        topics_list = list(self.topics.items())
        for topic, (message, timestamp) in reversed(topics_list[-max_rows:]):
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

    def run(self):
        # Setup MQTT client
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
        client.on_connect = self.on_connect
        client.on_disconnect = self.on_disconnect
        client.on_message = self.on_message

        try:
            client.connect(self.broker, self.port, 60)
        except Exception as e:
            self.status = f"Error: {e}"
            self.render()
            time.sleep(3)
            return

        # Start network loop in background
        client.loop_start()

        # Initial render
        self.render()

        # Main loop - handle keyboard input
        try:
            while True:
                key = self.stdscr.getch()
                if key == ord('q') or key == ord('Q'):
                    break
                elif key == ord('c') or key == ord('C'):
                    self.topics.clear()
                    self.message_count = 0
                    self.render()

                time.sleep(0.05)  # Small delay to prevent CPU spinning

        except KeyboardInterrupt:
            pass
        finally:
            client.loop_stop()
            client.disconnect()


def main(stdscr):
    parser = argparse.ArgumentParser(description='RGFX MQTT Monitor - Static UI')
    parser.add_argument('--broker', default='localhost',
                       help='MQTT broker host (default: localhost)')
    parser.add_argument('--port', type=int, default=1883,
                       help='MQTT broker port (default: 1883)')
    parser.add_argument('--topic', default='rgfx/#',
                       help='MQTT topic pattern to subscribe (default: rgfx/#)')

    args = parser.parse_args()

    monitor = MQTTMonitor(stdscr, args.broker, args.port, args.topic)
    monitor.run()


if __name__ == '__main__':
    try:
        curses.wrapper(main)
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit(0)
