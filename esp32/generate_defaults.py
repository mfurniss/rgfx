#!/usr/bin/env python3
"""
Generate effect defaults C++ header before build

This script is called automatically by PlatformIO before each build.
It runs the Node.js generator that converts defaults.json into a C++ header.
"""

import subprocess
from pathlib import Path

def main(project_dir=None):
    """Call Node.js defaults generator script

    Args:
        project_dir: ESP32 project directory (provided by PlatformIO or auto-detected)
    """
    if project_dir:
        script_dir = Path(project_dir)
    else:
        script_dir = Path(__file__).parent

    hub_dir = script_dir.parent / "rgfx-hub"
    generator = hub_dir / "scripts" / "generate-effect-defaults.mjs"

    if not generator.exists():
        print("Warning: generate-effect-defaults.mjs not found, skipping")
        return 1

    try:
        result = subprocess.run(
            ["node", str(generator)],
            cwd=str(hub_dir),
            capture_output=True,
            text=True,
            check=True
        )

        if result.stdout:
            print(result.stdout.strip())

        return 0

    except subprocess.CalledProcessError as e:
        print(f"Warning: Defaults generation failed: {e}")
        if e.stderr:
            print(f"stderr: {e.stderr}")
        print("Build will continue with existing effect_defaults.h (if present)")
        return 1
    except FileNotFoundError:
        print("Warning: Node.js not found in PATH")
        print("Build will continue with existing effect_defaults.h (if present)")
        return 1

if __name__ == '__main__':
    exit(main())
else:
    Import("env")
    project_dir = env.get("PROJECT_DIR")
    main(project_dir)
