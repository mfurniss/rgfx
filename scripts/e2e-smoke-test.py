#!/usr/bin/env python3
"""
RGFX E2E Smoke Test

Simulates game events and monitors Hub process health during test run.
Generates realistic event sequences matching actual transformer handlers.

Usage:
    python scripts/e2e-smoke-test.py                          # 60s, medium density, random games
    python scripts/e2e-smoke-test.py -d 300 --density high    # 5 minute stress test
    python scripts/e2e-smoke-test.py --game pacman -v         # Pac-Man only, verbose
    python scripts/e2e-smoke-test.py -o results.json          # Save results to file
"""

import argparse
import atexit
import json
import os
import random
import re
import signal
import statistics
import subprocess
import sys
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

try:
    import psutil
except ImportError:
    print("Error: psutil is required. Install with: pip install psutil")
    sys.exit(1)


# Global for cleanup - stores the PID of the process we launched
_hub_process_pid: Optional[int] = None


def _kill_process_tree(pid: int) -> None:
    """Kill a process and all its children recursively.

    Based on psutil best practices:
    https://gist.github.com/jizhilong/6687481
    https://psutil.readthedocs.io/en/latest/
    """
    try:
        parent = psutil.Process(pid)
    except psutil.NoSuchProcess:
        return

    # Get all children recursively BEFORE killing anything
    children = parent.children(recursive=True)

    # Kill children first (in reverse order - deepest first)
    for child in reversed(children):
        try:
            child.kill()
        except psutil.NoSuchProcess:
            pass

    # Kill parent
    try:
        parent.kill()
    except psutil.NoSuchProcess:
        pass

    # Wait for all to terminate
    gone, alive = psutil.wait_procs([parent] + children, timeout=3)
    if alive:
        # Force kill any survivors
        for p in alive:
            try:
                p.kill()
            except psutil.NoSuchProcess:
                pass


def _cleanup_hub():
    """Cleanup handler to terminate Hub on exit."""
    global _hub_process_pid
    if _hub_process_pid is None:
        return

    print("\n  Shutting down Hub...")
    print(f"  Killing process tree from PID {_hub_process_pid}...")

    _kill_process_tree(_hub_process_pid)

    print("  Hub terminated")
    _hub_process_pid = None


def _signal_handler(signum, _frame):
    """Handle interrupt signals."""
    _cleanup_hub()
    sys.exit(1)


# Density mappings: (min_delay, max_delay) in seconds
DENSITY_RANGES = {
    "low": (0.5, 2.0),      # ~1 event/sec
    "medium": (0.1, 0.5),   # ~5 events/sec
    "high": (0.02, 0.1),    # ~20 events/sec
    "stress": (0.005, 0.02) # ~100 events/sec
}

# Error patterns to detect in logs (must match [error] or [ERROR] level, not INFO)
ERROR_PATTERNS = [
    r"\[error\]",
    r"\[ERROR\]",
    r"\bError:\s",
    r"\bexception\b",
    r"\bException\b",
    r"\bCRASH\b",
    r"\bunhandled\b",
    r"\bUnhandledPromiseRejection\b",
]


class GameEvents(ABC):
    """Base class for game event generators."""

    @abstractmethod
    def get_next_event(self) -> tuple[str, str]:
        """Returns (topic, payload) for next event."""
        pass

    @abstractmethod
    def reset(self) -> None:
        """Reset game state for a new session."""
        pass


class PacManEvents(GameEvents):
    """Generates realistic Pac-Man event sequences."""

    def __init__(self):
        self.reset()

    def reset(self) -> None:
        self.score = 0
        self.dots_eaten = 0
        self.level = 1

    def get_next_event(self) -> tuple[str, str]:
        roll = random.random()

        if roll < 0.55:  # 55% - dot eaten (most common)
            self.dots_eaten += 1
            self.score += 10
            return ("pacman/player/eat", "dot")
        elif roll < 0.60:  # 5% - energizer
            self.score += 50
            return ("pacman/player/eat", "energizer")
        elif roll < 0.68:  # 8% - ghost eaten
            ghost = random.choice(["ghost1", "ghost2", "ghost3", "ghost4"])
            scores = {"ghost1": 200, "ghost2": 400, "ghost3": 800, "ghost4": 1600}
            self.score += scores[ghost]
            return ("pacman/player/eat", ghost)
        elif roll < 0.73:  # 5% - bonus item
            bonus = random.choice(
                ["cherry", "strawberry", "orange", "apple", "melon", "galaxian", "bell", "key"]
            )
            return ("pacman/player/eat", bonus)
        elif roll < 0.85:  # 12% - score update
            return ("pacman/player/score", str(self.score))
        elif roll < 0.90:  # 5% - ghost state change
            ghost = random.choice(["red", "pink", "blue", "orange"])
            state = random.choice([1, 5, 17])  # normal, chase, vulnerable
            return (f"pacman/ghost/{ghost}/state", str(state))
        elif roll < 0.94:  # 4% - player death
            return ("pacman/player/die", random.choice(["1", "2"]))
        elif roll < 0.97:  # 3% - level complete
            self.level += 1
            self.dots_eaten = 0
            return ("pacman/level/complete", "")
        else:  # 3% - credit insert
            return ("pacman/player/insert-coin", "")


class SMBEvents(GameEvents):
    """Generates realistic Super Mario Bros event sequences."""

    def __init__(self):
        self.reset()

    def reset(self) -> None:
        self.score = 0
        self.coins = 0

    def get_next_event(self) -> tuple[str, str]:
        roll = random.random()

        if roll < 0.35:  # 35% - coin
            self.coins += 1
            self.score += 200
            return ("smb/sfx/coin", "")
        elif roll < 0.50:  # 15% - score update
            return ("smb/player/score", str(self.score))
        elif roll < 0.58:  # 8% - powerup appear
            return ("smb/sfx/powerup-appear", "")
        elif roll < 0.65:  # 7% - powerup collect
            self.score += 1000
            return ("smb/sfx/powerup-collect", "")
        elif roll < 0.72:  # 7% - enter pipe
            return ("smb/sfx/enter-pipe", "")
        elif roll < 0.79:  # 7% - fireball
            return ("smb/sfx/mario-fireball", "")
        elif roll < 0.86:  # 7% - block smash
            return ("smb/sfx/block-smash", "")
        elif roll < 0.90:  # 4% - firework
            return ("smb/sfx/firework", "")
        else:  # 10% - music change
            track = random.choice(
                ["overworld", "castle", "underworld", "flag", "swimming", "power-star"]
            )
            return ("smb/music", track)


class RobotronEvents(GameEvents):
    """Generates realistic Robotron 2084 event sequences."""

    def __init__(self):
        self.reset()

    def reset(self) -> None:
        self.score = 0
        self.wave = 1
        self.hue = 0

    def get_next_event(self) -> tuple[str, str]:
        roll = random.random()

        if roll < 0.25:  # 25% - spark (enemy killed)
            self.score += 100
            return ("robotron/sfx/spark", "")
        elif roll < 0.35:  # 10% - grunt destroy
            self.score += 100
            return ("robotron/enemy/grunt/destroy", "")
        elif roll < 0.45:  # 10% - rescue human
            self.score += random.choice([1000, 2000, 3000, 4000, 5000])
            return ("robotron/sfx/rescue-human", "")
        elif roll < 0.52:  # 7% - shoot hulk
            return ("robotron/sfx/shoot-hulk", "")
        elif roll < 0.58:  # 6% - brain appear
            return ("robotron/sfx/brain-appear", "")
        elif roll < 0.64:  # 6% - tank appear
            return ("robotron/sfx/tank-appear", "")
        elif roll < 0.70:  # 6% - human programming
            return ("robotron/sfx/human-programming", "")
        elif roll < 0.75:  # 5% - human die
            return ("robotron/sfx/human-die", "")
        elif roll < 0.80:  # 5% - destroy electrode
            return ("robotron/sfx/destroy-electrode", "")
        elif roll < 0.84:  # 4% - destroy spheroid
            return ("robotron/sfx/destroy-spheroid", "")
        elif roll < 0.88:  # 4% - player death
            return ("robotron/sfx/player-death", "")
        elif roll < 0.94:  # 6% - score update
            return ("robotron/player/score", str(self.score))
        else:  # 6% - wave number
            self.wave = min(self.wave + 1, 99)
            return ("robotron/wave/number", str(self.wave))


class GalagaEvents(GameEvents):
    """Generates realistic Galaga event sequences."""

    def __init__(self):
        self.reset()

    def reset(self) -> None:
        self.score = 0

    def get_next_event(self) -> tuple[str, str]:
        roll = random.random()

        if roll < 0.40:  # 40% - player fire
            return ("galaga/player/fire", "")
        elif roll < 0.70:  # 30% - enemy destroy
            self.score += random.choice([50, 80, 100, 150, 160, 400])
            return ("galaga/enemy/destroy", "")
        else:  # 30% - score update
            return ("galaga/player/score", str(self.score))


class StarWarsEvents(GameEvents):
    """Generates realistic Star Wars arcade event sequences."""

    def __init__(self):
        self.reset()

    def reset(self) -> None:
        self.score = 0
        self.state = 12  # Attract mode

    def get_next_event(self) -> tuple[str, str]:
        roll = random.random()

        if roll < 0.30:  # 30% - player fire
            return ("starwars/player/fire", "")
        elif roll < 0.50:  # 20% - enemy destroy
            enemy = random.choice(
                ["tie", "fireball", "turret", "laser-bunker", "laser-tower"]
            )
            self.score += random.choice([500, 1000, 1500, 2000])
            return ("starwars/enemy/destroy", enemy)
        elif roll < 0.65:  # 15% - score update
            return ("starwars/player/score", str(self.score))
        elif roll < 0.75:  # 10% - shield hit
            return ("starwars/player/shield-reduced", "")
        else:  # 25% - game state
            # Cycle through interesting states
            self.state = random.choice([5, 6, 12, 14, 36, 37, 38, 39, 46, 51])
            return ("starwars/game/state", str(self.state))


class EventGenerator:
    """Generates and writes game events to the event log."""

    def __init__(self, event_file: Path, density: str):
        self.event_file = event_file
        self.density = density
        self.transformers_dir = Path.home() / ".rgfx" / "transformers" / "games"
        # Event generators for supported games
        self.games = {
            "pacman": PacManEvents(),
            "smb": SMBEvents(),
            "robotron": RobotronEvents(),
            "galaga": GalagaEvents(),
            "starwars": StarWarsEvents(),
        }
        self.current_game: Optional[str] = None

    def discover_games(self) -> list[str]:
        """Discover available games from transformers directory."""
        if not self.transformers_dir.exists():
            return []
        return [f.stem for f in self.transformers_dir.glob("*.js")]

    def get_testable_games(self) -> list[str]:
        """Get games that have both a transformer and an event generator."""
        discovered = set(self.discover_games())
        supported = set(self.games.keys())
        return sorted(discovered & supported)

    def write_event(self, topic: str, payload: str = "") -> None:
        """Append event to log file."""
        line = f"{topic} {payload}\n" if payload else f"{topic}\n"
        with open(self.event_file, "a") as f:
            f.write(line)

    def get_random_delay(self) -> float:
        """Get delay based on density with randomness."""
        min_d, max_d = DENSITY_RANGES[self.density]
        return random.uniform(min_d, max_d)

    def start_game(self, game: str) -> None:
        """Send init event and reset game state."""
        self.current_game = game
        self.games[game].reset()
        self.write_event(f"{game}/init")

    def end_game(self) -> None:
        """Send shutdown event."""
        if self.current_game:
            self.write_event(f"{self.current_game}/shutdown")

    def generate_event(self, game: str) -> None:
        """Generate and write a single game event."""
        topic, payload = self.games[game].get_next_event()
        self.write_event(topic, payload)


class ProcessMonitor:
    """Monitors Hub Electron process metrics (main + renderer)."""

    def __init__(self):
        self.process: Optional[psutil.Process] = None  # Main process (for compatibility)
        self.main_process: Optional[psutil.Process] = None
        self.renderer_process: Optional[psutil.Process] = None
        self.samples: list[dict] = []

    def find_hub_process(self, debug: bool = False, parent_pid: Optional[int] = None) -> bool:
        """Find RGFX Hub Electron processes by checking cmdline.

        Main process: path contains /rgfx/node_modules/electron/
        Helper processes: cmdline has --user-data-dir with rgfx-hub
        """
        if debug:
            print("  DEBUG: Searching for RGFX Hub Electron processes...")

        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                name = proc.info.get("name", "")
                pid = proc.info["pid"]
                cmdline = " ".join(proc.info.get("cmdline") or [])

                # Skip if not Electron-related
                if "Electron" not in name:
                    continue

                # Check if this is an RGFX Hub process:
                # - Main: path has /rgfx/node_modules/electron/
                # - Helpers: have rgfx-hub in user-data-dir
                is_hub = "/rgfx/node_modules/electron/" in cmdline or "rgfx-hub" in cmdline

                if not is_hub:
                    continue

                if debug:
                    print(f"    Found: PID {pid} ({name})")

                # Main process is named exactly "Electron"
                if name == "Electron":
                    self.main_process = psutil.Process(pid)
                    self.main_process.cpu_percent()  # Prime CPU measurement
                    self.process = self.main_process
                    if debug:
                        print(f"    -> Main process: PID {pid}")

                # Renderer process
                elif name == "Electron Helper (Renderer)":
                    self.renderer_process = psutil.Process(pid)
                    self.renderer_process.cpu_percent()  # Prime CPU measurement
                    if debug:
                        print(f"    -> Renderer process: PID {pid}")

            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        if debug and not self.main_process:
            print("  DEBUG: No main process found!")

        return self.main_process is not None

    def sample(self) -> dict:
        """Take a CPU/memory sample from both processes."""
        if not self.main_process:
            return {"error": "process not found"}

        try:
            sample = {"timestamp": time.time()}

            # Main process
            if self.main_process:
                try:
                    main_mem = self.main_process.memory_info()
                    sample["main_cpu_percent"] = self.main_process.cpu_percent()
                    sample["main_memory_mb"] = main_mem.rss / (1024 * 1024)
                except psutil.NoSuchProcess:
                    sample["main_memory_mb"] = 0
                    sample["main_cpu_percent"] = 0

            # Renderer process
            if self.renderer_process:
                try:
                    renderer_mem = self.renderer_process.memory_info()
                    sample["renderer_cpu_percent"] = self.renderer_process.cpu_percent()
                    sample["renderer_memory_mb"] = renderer_mem.rss / (1024 * 1024)
                except psutil.NoSuchProcess:
                    sample["renderer_memory_mb"] = 0
                    sample["renderer_cpu_percent"] = 0
            else:
                sample["renderer_memory_mb"] = 0
                sample["renderer_cpu_percent"] = 0

            # Totals
            sample["cpu_percent"] = sample.get("main_cpu_percent", 0) + sample.get("renderer_cpu_percent", 0)
            sample["memory_rss_mb"] = sample.get("main_memory_mb", 0) + sample.get("renderer_memory_mb", 0)

            self.samples.append(sample)
            return sample
        except psutil.NoSuchProcess:
            return {"error": "process terminated"}

    def get_stats(self) -> dict:
        """Calculate aggregate statistics."""
        if not self.samples:
            return {}

        cpu_values = [s["cpu_percent"] for s in self.samples if "cpu_percent" in s]
        total_mem_values = [s["memory_rss_mb"] for s in self.samples if "memory_rss_mb" in s]
        main_mem_values = [s["main_memory_mb"] for s in self.samples if "main_memory_mb" in s]
        renderer_mem_values = [s["renderer_memory_mb"] for s in self.samples if "renderer_memory_mb" in s]

        # Calculate memory trend on total
        trend = "stable"
        if len(total_mem_values) >= 4:
            quarter = len(total_mem_values) // 4
            first_quarter_avg = statistics.mean(total_mem_values[:quarter])
            last_quarter_avg = statistics.mean(total_mem_values[-quarter:])
            if first_quarter_avg > 0:
                change = (last_quarter_avg - first_quarter_avg) / first_quarter_avg
                if change > 0.20:
                    trend = "growing"
                elif change < -0.10:
                    trend = "declining"

        main_cpu_values = [s["main_cpu_percent"] for s in self.samples if "main_cpu_percent" in s]
        renderer_cpu_values = [s["renderer_cpu_percent"] for s in self.samples if "renderer_cpu_percent" in s]

        return {
            # Totals
            "cpu_avg": round(statistics.mean(cpu_values), 2) if cpu_values else 0,
            "cpu_max": round(max(cpu_values), 2) if cpu_values else 0,
            "memory_avg_mb": round(statistics.mean(total_mem_values), 2) if total_mem_values else 0,
            "memory_max_mb": round(max(total_mem_values), 2) if total_mem_values else 0,
            # Main process
            "main_cpu_avg": round(statistics.mean(main_cpu_values), 2) if main_cpu_values else 0,
            "main_cpu_max": round(max(main_cpu_values), 2) if main_cpu_values else 0,
            "main_memory_avg_mb": round(statistics.mean(main_mem_values), 2) if main_mem_values else 0,
            "main_memory_max_mb": round(max(main_mem_values), 2) if main_mem_values else 0,
            # Renderer process
            "renderer_cpu_avg": round(statistics.mean(renderer_cpu_values), 2) if renderer_cpu_values else 0,
            "renderer_cpu_max": round(max(renderer_cpu_values), 2) if renderer_cpu_values else 0,
            "renderer_memory_avg_mb": round(statistics.mean(renderer_mem_values), 2) if renderer_mem_values else 0,
            "renderer_memory_max_mb": round(max(renderer_mem_values), 2) if renderer_mem_values else 0,
            # Trend
            "memory_trend": trend,
            "sample_count": len(self.samples),
        }


class LogMonitor:
    """Monitors log files for errors."""

    def __init__(self):
        self.errors: list[dict] = []
        self.log_files = self._get_log_paths()
        self.file_positions: dict[Path, int] = {}
        self._compiled_patterns = [re.compile(p, re.IGNORECASE) for p in ERROR_PATTERNS]

    def _get_log_paths(self) -> list[Path]:
        """Get paths to all log files to monitor."""
        paths = []

        # Hub app log (electron-log location varies by platform)
        if sys.platform == "darwin":
            app_log = Path.home() / "Library/Logs/rgfx-hub/main.log"
        elif sys.platform == "win32":
            app_log = Path(os.environ.get("APPDATA", "")) / "rgfx-hub/logs/main.log"
        else:  # Linux
            app_log = Path.home() / ".config/rgfx-hub/logs/main.log"

        if app_log.exists():
            paths.append(app_log)

        # Driver logs
        driver_logs_dir = Path.home() / ".rgfx" / "logs"
        if driver_logs_dir.exists():
            for log_file in driver_logs_dir.glob("*.log"):
                paths.append(log_file)

        return paths

    def initialize_positions(self) -> None:
        """Set file positions to end of files (ignore pre-existing content)."""
        for log_path in self.log_files:
            if log_path.exists():
                try:
                    self.file_positions[log_path] = log_path.stat().st_size
                except OSError:
                    self.file_positions[log_path] = 0

    def check_for_errors(self) -> list[dict]:
        """Check log files for new errors since last check."""
        new_errors = []

        for log_path in self.log_files:
            if not log_path.exists():
                continue

            pos = self.file_positions.get(log_path, 0)

            try:
                with open(log_path, "r", errors="replace") as f:
                    f.seek(pos)
                    new_content = f.read()
                    self.file_positions[log_path] = f.tell()

                for line in new_content.split("\n"):
                    if not line.strip():
                        continue
                    for pattern in self._compiled_patterns:
                        if pattern.search(line):
                            error = {
                                "file": log_path.name,
                                "line": line.strip()[:200],
                                "timestamp": time.time(),
                            }
                            new_errors.append(error)
                            self.errors.append(error)
                            break

            except OSError:
                pass

        return new_errors


class DriverMonitor:
    """Monitors driver connections by watching the Hub's main log."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.rgfx_dir = Path.home() / ".rgfx"
        self.drivers_file = self.rgfx_dir / "drivers.json"
        self.expected_drivers: list[str] = []
        self.connected_drivers: set[str] = set()
        self.log_position: int = 0

        # Hub main log path (varies by platform)
        if sys.platform == "darwin":
            self.main_log = Path.home() / "Library/Logs/rgfx-hub/main.log"
        elif sys.platform == "win32":
            self.main_log = Path(os.environ.get("APPDATA", "")) / "rgfx-hub/logs/main.log"
        else:  # Linux
            self.main_log = Path.home() / ".config/rgfx-hub/logs/main.log"

        # Pattern to match: "[timestamp] [info] Driver connected: driver-01"
        self.connect_pattern = re.compile(r"Driver connected:\s*(\S+)")

    def load_expected_drivers(self) -> bool:
        """Load expected driver IDs from drivers.json."""
        if not self.drivers_file.exists():
            print(f"Error: drivers.json not found at {self.drivers_file}")
            return False

        try:
            with open(self.drivers_file, "r") as f:
                config = json.load(f)

            # Get enabled driver IDs
            self.expected_drivers = [
                d["id"] for d in config.get("drivers", [])
                if not d.get("disabled", False)
            ]

            if not self.expected_drivers:
                print("Warning: No enabled drivers found in drivers.json")

            return True
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing drivers.json: {e}")
            return False

    def scan_recent_connections(self, since_seconds: int = 60) -> None:
        """Scan log file for recent driver connections (within last N seconds)."""
        if not self.main_log.exists():
            return

        try:
            with open(self.main_log, "r", errors="replace") as f:
                content = f.read()
                self.log_position = f.tell()  # Set to end for future watching

            # Look for all "Driver connected:" messages in the file
            for line in content.split("\n"):
                match = self.connect_pattern.search(line)
                if match:
                    driver_id = match.group(1)
                    if driver_id in self.expected_drivers:
                        self.connected_drivers.add(driver_id)

        except OSError:
            pass

    def check_log_for_connections(self) -> list[str]:
        """Check main log for new driver connection messages."""
        newly_connected = []

        if not self.main_log.exists():
            return newly_connected

        try:
            with open(self.main_log, "r", errors="replace") as f:
                f.seek(self.log_position)
                new_content = f.read()
                self.log_position = f.tell()

            for line in new_content.split("\n"):
                match = self.connect_pattern.search(line)
                if match:
                    driver_id = match.group(1)
                    if driver_id in self.expected_drivers and driver_id not in self.connected_drivers:
                        self.connected_drivers.add(driver_id)
                        newly_connected.append(driver_id)

        except OSError:
            pass

        return newly_connected

    def wait_for_drivers(self, timeout: int = 30) -> bool:
        """Wait for all expected drivers to connect by watching the main log."""
        if not self.expected_drivers:
            print("  No drivers to wait for")
            return True

        print(f"  Waiting for {len(self.expected_drivers)} driver(s) to connect (timeout: {timeout}s)...")
        print(f"  Watching: {self.main_log}")

        # Reset state and scan for any recent connections already in log
        self.connected_drivers.clear()
        self.scan_recent_connections()

        # Report any already-connected drivers
        if self.connected_drivers and self.verbose:
            print(f"    Found {len(self.connected_drivers)} already connected: {list(self.connected_drivers)}")

        start = time.time()

        while (time.time() - start) < timeout:
            newly_connected = self.check_log_for_connections()

            if newly_connected and self.verbose:
                for driver_id in newly_connected:
                    print(f"    + {driver_id} connected")

            if self.verbose and not newly_connected:
                elapsed = time.time() - start
                print(f"    [{elapsed:.0f}s] Connected: {len(self.connected_drivers)}/{len(self.expected_drivers)}")

            if len(self.connected_drivers) >= len(self.expected_drivers):
                print(f"  All {len(self.expected_drivers)} driver(s) connected")
                return True

            time.sleep(1)

        # Timeout - report which drivers didn't connect
        missing = [d for d in self.expected_drivers if d not in self.connected_drivers]
        print(f"Error: Timeout waiting for drivers. Missing: {missing}")
        return False


class HubLauncher:
    """Launches and manages the Hub application."""

    def __init__(self, hub_dir: Path, verbose: bool = False):
        self.hub_dir = hub_dir
        self.verbose = verbose
        self.process: Optional[subprocess.Popen] = None

    def start(self) -> bool:
        """Start the Hub application."""
        global _hub_process_pid

        if not self.hub_dir.exists():
            print(f"Error: Hub directory not found: {self.hub_dir}")
            return False

        print(f"  Starting Hub from {self.hub_dir}...")

        try:
            # Use login shell to get proper PATH with node/npm
            self.process = subprocess.Popen(
                ["/bin/zsh", "-l", "-c", f"cd {self.hub_dir} && npm start"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
            )

            # Store PID for cleanup - this is the npm process that spawns everything
            _hub_process_pid = self.process.pid

            # Register cleanup handlers
            atexit.register(_cleanup_hub)
            signal.signal(signal.SIGINT, _signal_handler)
            signal.signal(signal.SIGTERM, _signal_handler)

            return True
        except FileNotFoundError:
            print("Error: npm not found. Is Node.js installed?")
            return False
        except Exception as e:
            print(f"Error starting Hub: {e}")
            return False

    def _find_hub_pid_via_ps(self) -> Optional[int]:
        """Find Hub's main Electron PID using ps aux."""
        result = subprocess.run(
            ["ps", "aux"],
            capture_output=True,
            text=True,
        )
        for line in result.stdout.split("\n"):
            if "/rgfx/node_modules/electron/" in line and "Electron" in line:
                parts = line.split()
                if len(parts) >= 2:
                    return int(parts[1])
        return None

    def wait_for_ready(self, timeout: int = 60) -> bool:
        """Wait for Hub process to be ready by looking for Electron with rgfx path."""
        print(f"  Waiting for Hub to start (timeout: {timeout}s)...")
        start = time.time()

        while (time.time() - start) < timeout:
            pid = self._find_hub_pid_via_ps()
            if pid:
                time.sleep(2)  # Let it initialize
                print(f"  Hub started (PID: {pid})")
                return True
            time.sleep(1)

        print("Error: Timeout waiting for Hub to start")
        return False

    def stop(self):
        """Stop the Hub application."""
        _cleanup_hub()


class TestRunner:
    """Orchestrates the smoke test."""

    def __init__(self, args: argparse.Namespace):
        self.duration = args.duration
        self.density = args.density
        self.game = args.game
        self.verbose = args.verbose
        self.output_file = args.output
        self.no_launch = args.no_launch

        # Determine Hub directory (relative to this script)
        script_dir = Path(__file__).parent
        self.hub_dir = script_dir.parent / "rgfx-hub"

        self.event_file = Path.home() / ".rgfx" / "interceptor_events.log"
        self.event_generator = EventGenerator(self.event_file, self.density)
        self.process_monitor = ProcessMonitor()
        self.log_monitor = LogMonitor()
        self.driver_monitor = DriverMonitor(self.verbose)
        self.hub_launcher: Optional[HubLauncher] = None

        self.events_sent = 0
        self.start_time = 0.0
        self.hub_was_launched = False
        self.drivers_connected = 0

    def run(self) -> dict:
        """Execute the smoke test."""
        print("RGFX E2E Smoke Test")
        print("=" * 40)
        print(f"  Duration: {self.duration}s")
        print(f"  Density:  {self.density}")
        print(f"  Game:     {self.game}")

        # Ensure event log directory exists
        self.event_file.parent.mkdir(parents=True, exist_ok=True)

        # Check if Hub is already running
        hub_already_running = self.process_monitor.find_hub_process(debug=self.verbose)

        if hub_already_running:
            print(f"  Hub PID:  {self.process_monitor.process.pid} (already running)")
        elif self.no_launch:
            print("\nError: Hub not running and --no-launch specified")
            return {"error": "RGFX Hub process not found", "status": "FAIL"}
        else:
            # Launch the Hub
            self.hub_launcher = HubLauncher(self.hub_dir, self.verbose)
            if not self.hub_launcher.start():
                return {"error": "Failed to start Hub", "status": "FAIL"}

            if not self.hub_launcher.wait_for_ready():
                self.hub_launcher.stop()
                return {"error": "Hub failed to start", "status": "FAIL"}

            self.hub_was_launched = True

            # Now find the Hub process for monitoring (use npm PID to find Electron children)
            npm_pid = self.hub_launcher.process.pid if self.hub_launcher.process else None
            if not self.process_monitor.find_hub_process(debug=self.verbose, parent_pid=npm_pid):
                print("\nError: Could not find Hub process after launch")
                self.hub_launcher.stop()
                return {"error": "Hub process not found after launch", "status": "FAIL"}

            print(f"  Hub PID:  {self.process_monitor.process.pid}")

        print("=" * 40)

        # Load expected drivers from config
        if not self.driver_monitor.load_expected_drivers():
            if self.hub_was_launched and self.hub_launcher:
                self.hub_launcher.stop()
            return {"error": "Failed to load drivers.json", "status": "FAIL"}

        # Wait for drivers to connect by watching the main log
        if self.driver_monitor.expected_drivers:
            if not self.driver_monitor.wait_for_drivers(timeout=30):
                if self.hub_was_launched and self.hub_launcher:
                    self.hub_launcher.stop()
                return {"error": "Timeout waiting for drivers to connect", "status": "FAIL"}
            self.drivers_connected = len(self.driver_monitor.connected_drivers)

        # Wait for buffered driver logs to drain before initializing log positions
        # Drivers send error logs via MQTT after connecting, so errors from before
        # the test (e.g., recovery from previous Hub shutdown) arrive shortly after connection
        print("  Waiting for driver logs to settle...")
        time.sleep(3)

        print("=" * 40)

        # Initialize log positions (ignore pre-existing errors)
        self.log_monitor.initialize_positions()

        # Discover testable games (have both transformer and event generator)
        all_testable = self.event_generator.get_testable_games()
        if not all_testable:
            if self.hub_was_launched and self.hub_launcher:
                self.hub_launcher.stop()
            return {"error": "No testable games found", "status": "FAIL"}

        # Determine which games to test
        if self.game == "random":
            # Test ALL games - random events from any game
            active_games = all_testable
        else:
            if self.game not in all_testable:
                if self.hub_was_launched and self.hub_launcher:
                    self.hub_launcher.stop()
                return {"error": f"Game '{self.game}' not testable", "status": "FAIL"}
            active_games = [self.game]

        print(f"  Testing: {', '.join(active_games)}")

        # Send init events for all active games
        for game in active_games:
            self.event_generator.start_game(game)
            self.events_sent += 1

        self.start_time = time.time()
        sample_interval = 1.0
        last_sample_time = 0.0

        try:
            while (time.time() - self.start_time) < self.duration:
                current_time = time.time()

                # Take process sample every second
                if current_time - last_sample_time >= sample_interval:
                    sample = self.process_monitor.sample()
                    self.log_monitor.check_for_errors()

                    if self.verbose:
                        elapsed = current_time - self.start_time
                        rate = self.events_sent / elapsed if elapsed > 1 else 0
                        print(
                            f"  [{elapsed:6.1f}s] Events: {self.events_sent:5d}, "
                            f"Rate: {rate:5.1f}/s, "
                            f"CPU: {sample.get('cpu_percent', 0):5.1f}%, "
                            f"Mem: {sample.get('memory_rss_mb', 0):6.1f}MB"
                        )

                    last_sample_time = current_time

                # Generate event from a random active game
                game = random.choice(active_games)
                self.event_generator.generate_event(game)
                self.events_sent += 1

                # Wait with random delay
                time.sleep(self.event_generator.get_random_delay())

        except KeyboardInterrupt:
            print("\n  Test interrupted by user")

        # Send shutdown events for all active games
        for game in active_games:
            self.event_generator.write_event(f"{game}/shutdown")
            self.events_sent += 1

        # Final error check
        self.log_monitor.check_for_errors()

        # Generate results
        results = self._generate_results()

        # Stop Hub if we launched it
        if self.hub_was_launched and self.hub_launcher:
            self.hub_launcher.stop()

        return results

    def _generate_results(self) -> dict:
        """Generate test results summary."""
        elapsed = time.time() - self.start_time
        process_stats = self.process_monitor.get_stats()
        error_count = len(self.log_monitor.errors)

        # Determine status
        status = "PASS"
        if error_count > 0:
            status = "FAIL"
        elif process_stats.get("memory_trend") == "growing":
            status = "WARN"

        results = {
            "test_duration_seconds": round(elapsed, 2),
            "density": self.density,
            "game": self.game,
            "drivers_connected": self.drivers_connected,
            "events": {
                "total_sent": self.events_sent,
                "rate_per_second": round(self.events_sent / elapsed, 2) if elapsed > 0 else 0,
            },
            "process": process_stats,
            "errors": {
                "count": error_count,
                "details": self.log_monitor.errors[:20],  # Limit to 20
            },
            "status": status,
        }

        return results


def main():
    parser = argparse.ArgumentParser(
        description="RGFX E2E Smoke Test - Simulates game events and monitors Hub health",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                         # 60s test, medium density, random games
  %(prog)s -d 300 --density high   # 5 minute stress test
  %(prog)s --game pacman -v        # Pac-Man only, verbose output
  %(prog)s -o results.json         # Save results to file
        """,
    )

    parser.add_argument(
        "--duration", "-d",
        type=int,
        default=60,
        help="Test duration in seconds (default: 60)",
    )
    parser.add_argument(
        "--density",
        type=str,
        default="medium",
        choices=["low", "medium", "high", "stress"],
        help="Event density (default: medium)",
    )
    parser.add_argument(
        "--game",
        type=str,
        default="random",
        choices=["pacman", "smb", "robotron", "galaga", "starwars", "random"],
        help="Game to simulate (default: random)",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Output JSON file for results",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output during test",
    )
    parser.add_argument(
        "--no-launch",
        action="store_true",
        help="Don't launch Hub automatically (requires Hub to be already running)",
    )

    args = parser.parse_args()

    runner = TestRunner(args)
    results = runner.run()

    # Print summary
    print("\n" + "=" * 40)
    print("Results")
    print("=" * 40)
    print(f"  Status:       {results.get('status', 'UNKNOWN')}")
    print(f"  Duration:     {results.get('test_duration_seconds', 0):.1f}s")
    print(f"  Drivers:      {results.get('drivers_connected', 0)}")
    print(f"  Events Sent:  {results.get('events', {}).get('total_sent', 0)}")
    print(f"  Events/sec:   {results.get('events', {}).get('rate_per_second', 0):.2f}")
    proc = results.get('process', {})
    print(f"  Memory Trend: {proc.get('memory_trend', 'unknown')}")
    print()
    print(f"  {'Process':<12} {'CPU Avg':>10} {'CPU Max':>10} {'Mem Avg':>10} {'Mem Max':>10}")
    print(f"  {'-'*12} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
    print(f"  {'Main':<12} {proc.get('main_cpu_avg', 0):>9.1f}% {proc.get('main_cpu_max', 0):>9.1f}% {proc.get('main_memory_avg_mb', 0):>8.1f}MB {proc.get('main_memory_max_mb', 0):>8.1f}MB")
    print(f"  {'Renderer':<12} {proc.get('renderer_cpu_avg', 0):>9.1f}% {proc.get('renderer_cpu_max', 0):>9.1f}% {proc.get('renderer_memory_avg_mb', 0):>8.1f}MB {proc.get('renderer_memory_max_mb', 0):>8.1f}MB")
    print(f"  {'-'*12} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
    print(f"  {'Total':<12} {proc.get('cpu_avg', 0):>9.1f}% {proc.get('cpu_max', 0):>9.1f}% {proc.get('memory_avg_mb', 0):>8.1f}MB {proc.get('memory_max_mb', 0):>8.1f}MB")
    print(f"  Errors Found: {results.get('errors', {}).get('count', 0)}")

    if results.get("errors", {}).get("count", 0) > 0:
        print("\nErrors detected:")
        for err in results["errors"]["details"][:5]:
            print(f"  - [{err['file']}] {err['line'][:80]}")

    # Save to file if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {args.output}")

    # Exit with status code
    sys.exit(0 if results.get("status") == "PASS" else 1)


if __name__ == "__main__":
    main()
