#!/usr/bin/env python3
"""
RGFX E2E Smoke Test

Soaks Hub and drivers with game events while monitoring process health.
Requires the Hub to be already running.

Usage:
    python scripts/e2e-smoke-test.py                  # 60s, medium density
    python scripts/e2e-smoke-test.py -d 300 -D high   # 5 minute stress test
    python scripts/e2e-smoke-test.py -v                # Verbose output
    python scripts/e2e-smoke-test.py -o results.json   # Save results to file
"""

import argparse
import json
import os
import random
import re
import statistics
import sys
import time
from pathlib import Path
from typing import Optional

try:
    import psutil
except ImportError:
    print("Error: psutil is required. Install with: pip install psutil")
    sys.exit(1)


# Density mappings: (min_delay, max_delay) in seconds
DENSITY_RANGES = {
    "low": (0.1, 0.5),      # ~5 events/sec
    "medium": (0.02, 0.1),  # ~20 events/sec
    "high": (0.005, 0.02),  # ~100 events/sec
    "stress": (0.003, 0.01) # ~200 events/sec
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

# Errors to ignore (expected during normal operation)
IGNORED_ERRORS = [
    r"MQTT reconnection failed.*resetting",
    r"Queue full",
]


# Event definitions: (topic, payload_options)
# payload_options: None = no payload, list = pick random, "_score_" = random int, "_fm_" = FM data
GAME_EVENTS = [
    # Pac-Man
    ("pacman/player/eat", ["dot", "energizer", "ghost1", "ghost2", "ghost3", "ghost4",
                            "cherry", "strawberry", "orange", "apple", "melon", "galaxian", "bell", "key"]),
    ("pacman/player/score", "_score_"),
    ("pacman/player/die", ["1", "2"]),
    ("pacman/player/insert-coin", None),
    ("pacman/level/complete", None),
    # Super Mario Bros
    ("smb/sfx/coin", None),
    ("smb/sfx/powerup-appear", None),
    ("smb/sfx/powerup-collect", None),
    ("smb/sfx/enter-pipe", None),
    ("smb/sfx/mario-fireball", None),
    ("smb/sfx/block-smash", None),
    ("smb/sfx/firework", None),
    ("smb/player/score", "_score_"),
    ("smb/music", ["overworld", "castle", "underworld", "flag", "swimming", "power-star"]),
    # Robotron 2084
    ("robotron/sfx/spark", None),
    ("robotron/sfx/shoot-hulk", None),
    ("robotron/sfx/brain-appear", None),
    ("robotron/sfx/tank-appear", None),
    ("robotron/sfx/human-programming", None),
    ("robotron/sfx/human-die", None),
    ("robotron/sfx/rescue-human", None),
    ("robotron/sfx/destroy-electrode", None),
    ("robotron/sfx/destroy-spheroid", None),
    ("robotron/sfx/player-death", None),
    ("robotron/sfx/enforcer-spawn", None),
    ("robotron/sfx/extra-life", None),
    ("robotron/sfx/game-start", None),
    ("robotron/enemy/grunt/destroy", None),
    ("robotron/player/score", "_score_"),
    ("robotron/player/lives", ["0", "1", "2", "3", "4", "5"]),
    ("robotron/wave/number", ["1", "2", "3", "5", "10", "15", "20"]),
    # Galaga
    ("galaga/player/fire", None),
    ("galaga/enemy/destroy", None),
    ("galaga/player/score", "_score_"),
    ("galaga/stage", ["1", "2", "3", "5", "8", "10", "15"]),
    ("galaga/bonus/score", ["150", "400", "800", "1000", "1500", "1600", "2000", "3000"]),
    ("galaga/player/captured", None),
    ("galaga/boss/tractor-beam", None),
    ("galaga/bonus/perfect", None),
    # Galaga '88
    ("galaga88/player/fire", None),
    ("galaga88/enemy/destroy/zako", ["50", "100"]),
    ("galaga88/enemy/destroy/goei", ["80", "160"]),
    ("galaga88/enemy/destroy/boss", ["150", "400"]),
    ("galaga88/enemy/destroy/don", ["1600"]),
    ("galaga88/enemy/destroy/don-attack", ["200"]),
    ("galaga88/enemy/destroy/hiyoko", ["600"]),
    ("galaga88/enemy/destroy/pan", ["1100", "1400"]),
    ("galaga88/player/score", "_score_"),
    ("galaga88/screen/text", ["START!", "READY", "PERFECT", "GALACTIC BONUS", "FIGHTER CAPTURED"]),
    # Defender
    ("defender/player/fire", None),
    ("defender/enemy/lander/destroy", None),
    ("defender/enemy/mutant/destroy", None),
    ("defender/enemy/baiter/destroy", None),
    ("defender/enemy/bomber/destroy", None),
    ("defender/enemy/pod/destroy", None),
    ("defender/enemy/swarmer/destroy", None),
    ("defender/player/score", "_score_"),
    ("defender/player/explode", None),
    ("defender/humanoid/lost", None),
    ("defender/humanoid/all-lost", None),
    ("defender/player/smart-bombs", ["0", "1", "2", "3"]),
    ("defender/player/smart-bomb-used", None),
    # OutRun
    ("outrun/music/fm", "_fm_"),
    ("outrun/game/time", ["80", "60", "40", "20", "10"]),
    # Super Hang-On
    ("shangon/music/fm", "_fm_"),
    ("shangon/game/time", ["80", "60", "40", "20", "10"]),
    # Star Wars
    ("starwars/player/fire", None),
    ("starwars/enemy/destroy/tie", None),
    ("starwars/enemy/destroy/fireball", None),
    ("starwars/enemy/destroy/turret", None),
    ("starwars/enemy/destroy/laser-bunker", None),
    ("starwars/enemy/destroy/laser-tower", None),
    ("starwars/enemy/destroy/vader", None),
    ("starwars/enemy/destroy/death-star", None),
    ("starwars/player/score", "_score_"),
    ("starwars/player/shield-reduced", None),
    ("starwars/game/state", ["5", "6", "12", "14", "36", "37", "38", "39", "46", "51"]),
]

# Game names derived from event topics
GAME_NAMES = sorted({topic.split("/")[0] for topic, _ in GAME_EVENTS})


class EventGenerator:
    """Generates and writes game events to the event log."""

    def __init__(self, event_file: Path, density: str):
        self.event_file = event_file
        self.density = density

    def write_event(self, topic: str, payload: str = "") -> None:
        """Append event to log file."""
        line = f"{topic} {payload}\n" if payload else f"{topic}\n"
        with open(self.event_file, "a") as f:
            f.write(line)

    def get_random_delay(self) -> float:
        """Get delay based on density with randomness."""
        min_d, max_d = DENSITY_RANGES[self.density]
        return random.uniform(min_d, max_d)

    def init_games(self) -> None:
        """Send init events for all games."""
        for game in GAME_NAMES:
            self.write_event(f"{game}/init")

    def shutdown_games(self) -> None:
        """Send shutdown events for all games."""
        for game in GAME_NAMES:
            self.write_event(f"{game}/shutdown")
        self.write_event("rgfx/clear-effects")

    def generate_event(self) -> None:
        """Generate and write a single random game event."""
        topic, options = random.choice(GAME_EVENTS)

        if options == "_score_":
            payload = str(random.randint(100, 99999))
        elif options == "_fm_":
            payload = ",".join(str(random.randint(0, 255)) for _ in range(8))
        elif options is None:
            payload = ""
        else:
            payload = random.choice(options)

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

        # Calculate memory trend, skipping warm-up period.
        # Compare 3rd quarter vs 4th quarter so both are post-warm-up.
        trend = "stable"
        if len(total_mem_values) >= 8:
            quarter = len(total_mem_values) // 4
            q3_avg = statistics.mean(total_mem_values[quarter * 2:quarter * 3])
            q4_avg = statistics.mean(total_mem_values[quarter * 3:])
            if q3_avg > 0:
                change = (q4_avg - q3_avg) / q3_avg
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
        self._ignored_patterns = [re.compile(p, re.IGNORECASE) for p in IGNORED_ERRORS]

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

    def clear_driver_logs(self) -> None:
        """Clear driver log files before test starts."""
        driver_logs_dir = Path.home() / ".rgfx" / "logs"
        if driver_logs_dir.exists():
            for log_file in driver_logs_dir.glob("*.log"):
                try:
                    log_file.write_text("")
                except OSError:
                    pass

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
                    # Skip ignored errors (expected during Hub restarts)
                    if any(p.search(line) for p in self._ignored_patterns):
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
        self.disconnected_drivers: set[str] = set()
        self.crashes_detected: int = 0
        self.log_position: int = 0

        # Hub main log path (varies by platform)
        if sys.platform == "darwin":
            self.main_log = Path.home() / "Library/Logs/rgfx-hub/main.log"
        elif sys.platform == "win32":
            self.main_log = Path(os.environ.get("APPDATA", "")) / "rgfx-hub/logs/main.log"
        else:
            self.main_log = Path.home() / ".config/rgfx-hub/logs/main.log"

        self.disconnect_pattern = re.compile(r"Driver (\S+) (?:went offline|timed out)")
        self.crash_recovery_pattern = re.compile(r"CRASH RECOVERY")

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

    def check_for_disconnections_and_crashes(self) -> tuple[list[str], int]:
        """Check main log for driver disconnections and crash recovery events.

        Returns:
            Tuple of (newly_disconnected driver IDs, new crash count)
        """
        newly_disconnected: list[str] = []
        new_crashes = 0

        if not self.main_log.exists():
            return newly_disconnected, new_crashes

        try:
            with open(self.main_log, "r", errors="replace") as f:
                f.seek(self.log_position)
                new_content = f.read()
                self.log_position = f.tell()

            for line in new_content.split("\n"):
                # Check for driver disconnection
                match = self.disconnect_pattern.search(line)
                if match:
                    driver_id = match.group(1)
                    if driver_id not in self.disconnected_drivers:
                        self.disconnected_drivers.add(driver_id)
                        newly_disconnected.append(driver_id)

                # Check for crash recovery
                if self.crash_recovery_pattern.search(line):
                    self.crashes_detected += 1
                    new_crashes += 1

        except OSError:
            pass

        return newly_disconnected, new_crashes



class TestRunner:
    """Orchestrates the smoke test."""

    def __init__(self, args: argparse.Namespace):
        self.duration = args.duration
        self.density = args.density
        self.verbose = args.verbose
        self.output_file = args.output

        self.event_file = Path.home() / ".rgfx" / "interceptor-events.log"
        self.event_generator = EventGenerator(self.event_file, self.density)
        self.process_monitor = ProcessMonitor()
        self.log_monitor = LogMonitor()
        self.driver_monitor = DriverMonitor(self.verbose)

        self.events_sent = 0
        self.start_time = 0.0

    def run(self) -> dict:
        """Execute the smoke test."""
        print("RGFX E2E Smoke Test")
        print("=" * 40)
        print(f"  Duration: {self.duration}s")
        print(f"  Density:  {self.density}")
        print(f"  Games:    {', '.join(GAME_NAMES)}")

        # Ensure event log directory exists
        self.event_file.parent.mkdir(parents=True, exist_ok=True)

        # Find running Hub process
        if not self.process_monitor.find_hub_process(debug=self.verbose):
            print("\nError: Hub not running")
            return {"error": "RGFX Hub process not found", "status": "FAIL"}

        print(f"  Hub PID:  {self.process_monitor.process.pid}")
        print("=" * 40)

        # Clear driver logs and initialize log monitoring
        self.log_monitor.clear_driver_logs()
        self.log_monitor.initialize_positions()

        # Initialize driver crash/disconnect monitoring from current log position
        self.driver_monitor.load_expected_drivers()
        if self.driver_monitor.main_log.exists():
            self.driver_monitor.log_position = self.driver_monitor.main_log.stat().st_size

        # Send init events and start generating
        self.event_generator.init_games()
        self.events_sent += len(GAME_NAMES)

        self.start_time = time.time()
        last_sample_time = 0.0

        try:
            while (time.time() - self.start_time) < self.duration:
                current_time = time.time()

                # Take process sample every second
                if current_time - last_sample_time >= 1.0:
                    sample = self.process_monitor.sample()
                    self.log_monitor.check_for_errors()

                    disconnected, crashes = self.driver_monitor.check_for_disconnections_and_crashes()
                    for driver_id in disconnected:
                        print(f"  WARNING: Driver {driver_id} disconnected!")
                    if crashes > 0:
                        print(f"  WARNING: {crashes} driver crash(es) detected!")

                    if self.verbose:
                        elapsed = current_time - self.start_time
                        rate = self.events_sent / elapsed if elapsed > 1 else 0
                        print(
                            f"  [{elapsed:4.0f}s] Events: {self.events_sent:5d}, "
                            f"Rate: {rate:5.1f}/s, "
                            f"CPU: {sample.get('cpu_percent', 0):5.1f}%, "
                            f"Mem: {sample.get('memory_rss_mb', 0):6.1f}MB"
                        )

                    last_sample_time = current_time

                self.event_generator.generate_event()
                self.events_sent += 1
                time.sleep(self.event_generator.get_random_delay())

        except KeyboardInterrupt:
            print("\n  Test interrupted by user")

        # Cooldown: stop events, keep monitoring
        cooldown_seconds = 10
        print(f"  Cooldown: monitoring for {cooldown_seconds}s with no events...")
        cooldown_start = time.time()
        while (time.time() - cooldown_start) < cooldown_seconds:
            sample = self.process_monitor.sample()
            self.log_monitor.check_for_errors()

            disconnected, crashes = self.driver_monitor.check_for_disconnections_and_crashes()
            for driver_id in disconnected:
                print(f"  WARNING: Driver {driver_id} disconnected during cooldown!")
            if crashes > 0:
                print(f"  WARNING: {crashes} driver crash(es) during cooldown!")

            if self.verbose:
                elapsed = time.time() - self.start_time
                print(
                    f"  [{elapsed:4.0f}s] COOLDOWN  "
                    f"CPU: {sample.get('cpu_percent', 0):5.1f}%, "
                    f"Mem: {sample.get('memory_rss_mb', 0):6.1f}MB"
                )

            time.sleep(1)

        self.event_generator.shutdown_games()
        self.events_sent += len(GAME_NAMES) + 1

        # Allow MQTT QoS 2 clear-effects to be delivered to drivers
        time.sleep(2)

        self.log_monitor.check_for_errors()
        return self._generate_results()

    def _generate_results(self) -> dict:
        """Generate test results summary."""
        elapsed = time.time() - self.start_time
        process_stats = self.process_monitor.get_stats()
        error_count = len(self.log_monitor.errors)
        disconnected_count = len(self.driver_monitor.disconnected_drivers)
        crash_count = self.driver_monitor.crashes_detected

        status = "PASS"
        if error_count > 0:
            status = "FAIL"
        elif disconnected_count > 0:
            status = "FAIL"
        elif crash_count > 0:
            status = "FAIL"
        elif process_stats.get("memory_trend") == "growing":
            status = "WARN"

        return {
            "test_duration_seconds": round(elapsed, 2),
            "density": self.density,
            "drivers_disconnected": list(self.driver_monitor.disconnected_drivers),
            "crashes_detected": crash_count,
            "events": {
                "total_sent": self.events_sent,
                "rate_per_second": round(self.events_sent / elapsed, 2) if elapsed > 0 else 0,
            },
            "process": process_stats,
            "errors": {
                "count": error_count,
                "details": self.log_monitor.errors[:20],
            },
            "status": status,
        }


def main():
    parser = argparse.ArgumentParser(
        description="RGFX E2E Smoke Test - Soaks Hub and drivers with game events while monitoring health",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                         # 60s test, medium density
  %(prog)s -d 300 -D high          # 5 minute stress test
  %(prog)s -v                      # Verbose output
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
        "--density", "-D",
        type=str,
        default="medium",
        choices=["low", "medium", "high", "stress"],
        help="Event density (default: medium)",
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

    args = parser.parse_args()

    runner = TestRunner(args)
    results = runner.run()

    # Print summary
    print("\n" + "=" * 40)
    print("Results")
    print("=" * 40)
    print(f"  Status:       {results.get('status', 'UNKNOWN')}")
    print(f"  Duration:     {results.get('test_duration_seconds', 0):.1f}s")
    disconnected = results.get('drivers_disconnected', [])
    if disconnected:
        print(f"  Disconnected: {len(disconnected)} ({', '.join(disconnected)})")
    crashes = results.get('crashes_detected', 0)
    if crashes:
        print(f"  Crashes:      {crashes}")
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
            print(f"  - [{err['file']}] {err['line'][:200]}")

    # Save to file if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {args.output}")

    # Exit with status code
    sys.exit(0 if results.get("status") == "PASS" else 1)


if __name__ == "__main__":
    main()
