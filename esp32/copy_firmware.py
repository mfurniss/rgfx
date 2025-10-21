Import("env")
import shutil
from pathlib import Path

def copy_firmware(source, target, env):
    """Copy compiled firmware to esp32-installer folder"""
    firmware_source = str(target[0])

    # Get project root (parent of esp32 folder)
    project_root = Path(env['PROJECT_DIR']).parent
    installer_dir = project_root / 'esp32-installer'

    # Copy the firmware.bin file
    firmware_dest = installer_dir / 'firmware.bin'

    print(f"Copying firmware from {firmware_source} to {firmware_dest}")
    shutil.copy2(firmware_source, firmware_dest)
    print("Firmware copied successfully!")

# Register the callback to run after build
env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", copy_firmware)
