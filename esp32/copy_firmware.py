Import("env")
import shutil
from pathlib import Path

def copy_firmware(source, target, env):
    """Copy compiled firmware and required flash files to esp32-installer folder"""
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

# Register the callback to run after build
env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", copy_firmware)
