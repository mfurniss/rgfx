#!/usr/bin/env python3
"""
Inject version into ESP32 firmware before build

This script is called automatically by PlatformIO before each build.
It runs the Node.js version injection script from the project root.
"""

import subprocess
import os
from pathlib import Path

def main(project_dir=None):
    """Call Node.js version injection script

    Args:
        project_dir: ESP32 project directory (provided by PlatformIO or auto-detected)
    """
    print("\n=== Injecting version from git tag ===")

    # Get project root (parent of esp32 directory)
    if project_dir:
        # PlatformIO mode - use provided directory
        script_dir = Path(project_dir)
    else:
        # Standalone mode - use __file__
        script_dir = Path(__file__).parent

    project_root = script_dir.parent
    version_script = project_root / "scripts" / "inject-version-driver.js"

    try:
        # Call Node.js script from project root
        result = subprocess.run(
            ["node", str(version_script)],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            check=True
        )

        # Print output from version script
        if result.stdout:
            print(result.stdout.strip())

        print("=== Version injection complete ===\n")
        return 0

    except subprocess.CalledProcessError as e:
        print(f"Warning: Version injection failed: {e}")
        if e.stderr:
            print(f"stderr: {e.stderr}")
        print("Build will continue with existing version.h (if present)\n")
        return 1
    except FileNotFoundError:
        print("Warning: Node.js not found in PATH")
        print("Build will continue with existing version.h (if present)\n")
        return 1

if __name__ == '__main__':
    # Standalone mode - called directly from command line or CI
    exit(main())
else:
    # PlatformIO mode - called as extra script
    # Get project directory from PlatformIO environment
    Import("env")
    project_dir = env.get("PROJECT_DIR")
    main(project_dir)
