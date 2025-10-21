#!/usr/bin/env python3
"""
RGFX Network Bridge UI Module
Static terminal UI for displaying network bridge events.
"""

import curses
from datetime import datetime
from collections import OrderedDict


class BridgeUI:
    def __init__(self, stdscr):
        self.stdscr = stdscr
        self.topics = OrderedDict()  # topic -> (message, timestamp)
        self.status = "Starting..."
        self.message_count = 0
        self.sent_count = 0
        self.logfile_path = ""
        self.udp_ip = ""
        self.udp_port = ""

        # Setup curses
        curses.curs_set(0)  # Hide cursor

        # Setup colors
        curses.start_color()
        curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)  # Header
        curses.init_pair(2, curses.COLOR_CYAN, curses.COLOR_BLACK)   # Topic
        curses.init_pair(3, curses.COLOR_YELLOW, curses.COLOR_BLACK) # Message
        curses.init_pair(4, curses.COLOR_WHITE, curses.COLOR_BLACK)  # Timestamp

    def set_status(self, status):
        self.status = status
        self.render()

    def set_udp(self, ip, port):
        self.udp_ip = ip
        self.udp_port = port
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
            title = "RGFX Network Bridge"
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


            # UDP line
            udp_line = f"UDP IP: {self.udp_ip} | UDP Port: {self.udp_port}"
            self.stdscr.addstr(3, 0, udp_line[:width-1])

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
            footer = "Press Ctrl+C to quit"
            try:
                self.stdscr.addstr(height - 1, 0, footer[:width-1],
                                  curses.color_pair(1))
            except curses.error:
                pass

            self.stdscr.refresh()
        except Exception:
            pass  # Ignore render errors
