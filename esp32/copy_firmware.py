import shutil
import sys
from pathlib import Path

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

# Detect if running standalone or as PlatformIO script
if __name__ == "__main__":
    # Standalone mode - called directly from command line or CI
    copy_firmware_standalone()
else:
    # PlatformIO mode - called as extra script
    Import("env")
    # Register the callback to run after build
    env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", copy_firmware_pio)
