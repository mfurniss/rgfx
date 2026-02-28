# Configure MAME

RGFX uses MAME's `-autoboot_script` feature to load its Lua interceptor when a game starts. This page explains how to launch MAME with RGFX enabled.

## How It Works

MAME's `-autoboot_script` flag tells MAME to execute a Lua script at startup. RGFX uses this to load `rgfx.lua`, which automatically detects which game is running, loads the matching interceptor, and starts emitting events.

You don't need to install MAME plugins, modify your `mame.ini`, or change your ROM directory structure. Just add one flag to your MAME launch command.

## Find rgfx.lua

The `rgfx.lua` script is bundled inside the RGFX Hub application:

| Platform | Location |
|----------|----------|
| macOS | `RGFX Hub.app/Contents/Resources/mame/rgfx.lua` |
| Windows | `<install folder>\resources\mame\rgfx.lua` |

On macOS, you can find this by right-clicking **RGFX Hub.app** and selecting **Show Package Contents**, then navigating to `Contents/Resources/mame/`.

## Launch MAME

Add the `-autoboot_script` flag pointing to `rgfx.lua`:

**macOS:**

```bash
mame pacman -autoboot_script "/Applications/RGFX Hub.app/Contents/Resources/mame/rgfx.lua"
```

**Windows:**

```
mame pacman -autoboot_script "C:\Program Files\RGFX Hub\resources\mame\rgfx.lua"
```

Replace `pacman` with any ROM name and adjust the path to match where you installed RGFX Hub.

!!! tip "ROM names"
    The ROM name is the filename of your ROM file without the extension — for example, `pacman.zip` has the ROM name `pacman`. This is the same name MAME uses on the command line.

### Launch Scripts

RGFX includes convenience launch scripts that handle the `-autoboot_script` path automatically:

**macOS:**

```bash
"/Applications/RGFX Hub.app/Contents/MacOS/launch-mame.sh" pacman
```

**Windows:**

```
"C:\Program Files\RGFX Hub\launch-mame.bat" pacman
```

The scripts find `rgfx.lua` in the app bundle, locate your MAME installation, and launch the game with the correct flags.

## Frontend Integration

RGFX works with any emulation frontend — LaunchBox, AttractMode, EmulationStation, or others — as long as the frontend launches MAME as an external process.

To configure your frontend, add the `-autoboot_script` argument to your MAME emulator settings. Most frontends have a field for additional command-line arguments. Add:

**macOS:**
```
-autoboot_script "/Applications/RGFX Hub.app/Contents/Resources/mame/rgfx.lua"
```

**Windows:**
```
-autoboot_script "C:\Program Files\RGFX Hub\resources\mame\rgfx.lua"
```

Adjust the path to match where you installed RGFX Hub. The frontend doesn't need to know anything else about RGFX — the script handles everything from there.

## What Happens at Launch

When MAME starts with the RGFX script:

1. `rgfx.lua` initializes and waits for the game to start
2. It detects the ROM name (e.g., `pacman`) and looks up the matching interceptor in `rom_map.lua`
3. The interceptor loads and begins monitoring game memory for events
4. Events are written to `interceptor-events.log` in your [config directory](hub-setup.md#config-directory)
5. RGFX Hub picks up the events and triggers LED effects on your drivers

All of this happens automatically. You should see events appearing in the Hub's [Event Monitor](../hub-app/event-monitor.md) as soon as the game starts.

## Verify It's Working

1. Make sure RGFX Hub is running
2. Launch a game with the `-autoboot_script` flag (try `pacman` for a quick test)
3. Open the Hub's [Event Monitor](../hub-app/event-monitor.md)
4. Play the game — you should see events streaming in as you interact with it

If no events appear, check the [troubleshooting guide](../faq.md#no-events-appear-when-playing-a-game).

## Next Step

[Play a game :material-arrow-right:](play.md)
