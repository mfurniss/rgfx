import shutil
import sys
import hashlib
import json
import re
from pathlib import Path
from datetime import datetime, timezone

# Firmware files with their flash addresses
FIRMWARE_FILES = [
    {'name': 'bootloader.bin', 'address': 0x1000},
    {'name': 'partitions.bin', 'address': 0x8000},
    {'name': 'firmware.bin', 'address': 0x10000},
]

def get_version(project_root):
    """Extract version from version.h"""
    version_file = project_root / 'esp32' / 'src' / 'version.h'
    try:
        content = version_file.read_text()
        match = re.search(r'#define RGFX_VERSION "([^"]+)"', content)
        return match.group(1) if match else 'unknown'
    except Exception:
        return 'unknown'

def sha256_file(file_path):
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()

def copy_to_hub_public(project_root, build_dir):
    """Copy firmware files to Hub's public folder with manifest and checksums"""
    hub_firmware_dir = project_root / 'rgfx-hub' / 'public' / 'esp32' / 'firmware'
    hub_firmware_dir.mkdir(parents=True, exist_ok=True)

    version = get_version(project_root)
    manifest = {
        'version': version,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'files': []
    }

    print("\nCopying files to rgfx-hub/public/esp32/firmware:")
    for file_info in FIRMWARE_FILES:
        source_path = build_dir / file_info['name']
        dest_path = hub_firmware_dir / file_info['name']

        if source_path.exists():
            shutil.copy2(source_path, dest_path)
            checksum = sha256_file(dest_path)
            size = dest_path.stat().st_size

            manifest['files'].append({
                'name': file_info['name'],
                'address': file_info['address'],
                'size': size,
                'sha256': checksum
            })

            print(f"  ✓ {file_info['name']} ({size} bytes, SHA256: {checksum[:16]}...)")
        else:
            print(f"  ✗ {file_info['name']} not found at {source_path}")

    # Write manifest
    manifest_path = hub_firmware_dir / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    print(f"  ✓ manifest.json")
    print(f"Firmware v{version} copied to Hub public folder\n")

def copy_firmware_standalone():
    """Copy compiled firmware and required flash files to esp32-installer folder (standalone mode)"""
    # Get project root (script is in esp32/, project root is parent)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Build directory
    build_dir = script_dir / '.pio' / 'build' / 'rgfx-driver'
    installer_dir = project_root / 'esp32-installer'

    # Ensure installer directory exists
    installer_dir.mkdir(parents=True, exist_ok=True)

    # Files to copy with their sources
    # Note: boot_app0.bin is not included because it's a static file from the
    # Arduino framework that never changes. It's already in esp32-installer/
    # and only needs to be copied once.
    files_to_copy = {
        'firmware.bin': build_dir / 'firmware.bin',
        'bootloader.bin': build_dir / 'bootloader.bin',
        'partitions.bin': build_dir / 'partitions.bin',
    }

    print("\nCopying files to esp32-installer:")
    all_ok = True
    for dest_name, source_path in files_to_copy.items():
        dest_path = installer_dir / dest_name
        if source_path.exists():
            shutil.copy2(source_path, dest_path)
            print(f"  ✓ {dest_name}")
        else:
            print(f"  ✗ {dest_name} not found at {source_path}")
            all_ok = False

    # Check if boot_app0.bin exists (it should be in git already)
    boot_app0_path = installer_dir / 'boot_app0.bin'
    if boot_app0_path.exists():
        print(f"  ✓ boot_app0.bin (already present)")
    else:
        print(f"  ✗ boot_app0.bin missing from esp32-installer/")
        all_ok = False

    if all_ok:
        print("All files copied successfully!\n")
    else:
        print("Some files were missing!\n")
        sys.exit(1)

    # Also copy to Hub public folder with checksums
    copy_to_hub_public(project_root, build_dir)

def copy_firmware_pio(source, target, env):
    """Copy compiled firmware and required flash files to esp32-installer folder (PlatformIO callback)"""
    # Get paths from environment
    firmware_source = str(target[0])
    build_dir = Path(firmware_source).parent

    # Get project root (parent of esp32 folder)
    project_root = Path(env['PROJECT_DIR']).parent
    installer_dir = project_root / 'esp32-installer'

    # Files to copy with their sources
    files_to_copy = {
        'firmware.bin': Path(firmware_source),
        'bootloader.bin': build_dir / 'bootloader.bin',
        'partitions.bin': build_dir / 'partitions.bin',
        'boot_app0.bin': Path(env['FLASH_EXTRA_IMAGES'][2][1])  # boot_app0.bin from framework
    }

    print("\nCopying files to esp32-installer:")
    for dest_name, source_path in files_to_copy.items():
        dest_path = installer_dir / dest_name
        if source_path.exists():
            shutil.copy2(source_path, dest_path)
            print(f"  ✓ {dest_name}")
        else:
            print(f"  ✗ {dest_name} not found at {source_path}")

    print("All files copied successfully!\n")

    # Also copy to Hub public folder with checksums
    copy_to_hub_public(project_root, build_dir)

# Detect if running standalone or as PlatformIO script
if __name__ == "__main__":
    # Standalone mode - called directly from command line or CI
    copy_firmware_standalone()
else:
    # PlatformIO mode - called as extra script
    Import("env")
    # Register the callback to run after build
    env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", copy_firmware_pio)
