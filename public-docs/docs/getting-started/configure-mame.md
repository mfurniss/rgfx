# Configure MAME

## Launch MAME

The simplest way to launch MAME with RGFX is using the launch script in your [config directory](hub-setup.md#config-directory). RGFX Hub installs this script automatically on first launch with paths pre-configured for your system.

**macOS:**

```bash
~/.rgfx/launch-mame.sh <romname>
```

**Windows:**

```
%USERPROFILE%\.rgfx\launch-mame.bat <romname>
```

Replace `<romname>` with your actual ROM name.

The launch script auto-detects your MAME installation, sets the ROM path, and passes the correct `-autoboot_script` flag. You can edit the script to customize paths — the configurable variables are at the top of the file. Delete the script and relaunch the Hub to get a fresh copy.

## What Happens at Launch

When MAME starts with the RGFX script:

1. `rgfx.lua` initializes and waits for the game to start
2. It detects the ROM name and looks up the matching interceptor (via `rom_map.json` for variants, or by convention `{romname}_rgfx`)
3. The interceptor loads and begins monitoring game memory for events
4. Events are written to `interceptor-events.log` in your [config directory](hub-setup.md#config-directory)
5. RGFX Hub picks up the events and triggers LED effects on your drivers

All of this happens automatically. You should see events appearing in the Hub's [Event Monitor](../hub-app/event-monitor.md) as soon as the game starts.

## Verify It's Working

1. Make sure RGFX Hub is running
2. Launch a game using the launch script
3. Open the Hub's [Event Monitor](../hub-app/event-monitor.md)
4. Play the game — you should see events streaming in as you interact with it

If no events appear, check the [troubleshooting guide](../faq.md#no-events-appear-when-playing-a-game).

## Advanced: Manual Launch

If you prefer to launch MAME yourself, add the `-autoboot_script` flag pointing to `rgfx.lua`. You can find the full path to `rgfx.lua` at the top of the launch script (`RGFX_LUA_PATH`).

```
mame <romname> -autoboot_script "/path/to/rgfx.lua"
```

## Advanced: Frontend Integration

RGFX works with any emulation frontend — LaunchBox, AttractMode, EmulationStation, or others — as long as the frontend launches MAME as an external process.

To configure your frontend, add the `-autoboot_script` argument to your MAME emulator settings. Most frontends have a field for additional command-line arguments. Copy the `RGFX_LUA_PATH` value from the top of your launch script and use it as the path:

```
-autoboot_script "/path/to/rgfx.lua"
```

The frontend doesn't need to know anything else about RGFX — the script handles everything from there.

## Next Step

[Play a game :material-arrow-right:](play.md)
