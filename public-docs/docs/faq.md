# Frequently Asked Questions

## Where do I get game ROMs?

RGFX does not include or distribute game ROMs. You should only play games you legally own. ROM files for arcade games you own can be found by searching the internet — I can't link to specific sources.

Once you have ROM files, place them in a folder and point RGFX Hub to that folder in [Settings](hub-app/settings.md).

## Does RGFX work with my emulation frontend?

RGFX should work with most frontends (LaunchBox, AttractMode, EmulationStation, etc.) as long as the frontend launches MAME as an external application. You'll need to add the `-autoboot_script` argument pointing to `rgfx.lua` in your frontend's MAME emulator settings — refer to your frontend's documentation for how to add custom command-line arguments. See [Configure MAME](getting-started/configure-mame.md#advanced-frontend-integration) for the RGFX side of the setup.

## Does RGFX work with emulators other than MAME?

Not yet. RGFX currently relies on MAME's Lua plugin API to monitor game memory and detect events. I'd like to support other emulators in the future — if your favorite emulator exposes a scripting or plugin interface, that's a good candidate. For now, MAME version 0.250 or later is required.

## Do I need to know JavaScript and Lua?

Not to use RGFX with the included example games — those work out of the box.

To **add a new game**, you'll write a Lua interceptor script. To **customize effects**, you'll edit a JavaScript transformer script. Both are short, readable files — not full applications. The existing game scripts are good templates to copy and modify.

If you're new to either language, these free resources are a good starting point:

- **Lua** — [Learn Lua in 15 Minutes](https://tylerneylon.com/a/learn-lua/) for a quick overview, or the official [Programming in Lua](https://www.lua.org/pil/1.html) guide for more depth
- **JavaScript** — [The Modern JavaScript Tutorial](https://javascript.info/) or [MDN's JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) from Mozilla

## How does MAME's Lua scripting work?

MAME has a built-in Lua engine that lets plugins read game memory, hook into events, and interact with the emulator while a game is running. RGFX interceptors are MAME Lua plugins. The official MAME Lua scripting documentation is at [docs.mamedev.org/luascript](https://docs.mamedev.org/luascript/index.html), and the RGFX [MAME API](interceptors/mame-api.md) page covers the specific parts used by interceptors.

## How do I add support for a new game?

Any game that runs in MAME can work with RGFX. The [Writing Interceptors](interceptors/writing-interceptors.md) guide walks you through the process — from finding memory addresses with MAME's debugger to emitting your first event. The [existing game scripts](example-games.md) are good examples to study.

## Can I customize the effects for a game?

Yes. Each game's effects are controlled by a transformer script — a JavaScript file you can edit. Changes take effect immediately without restarting the Hub. See the [Writing Transformers](transformers/writing-transformers.md) guide.

## Why scripting instead of simple config files?

A config-based system (YAML/JSON mapping events to effects) would be simpler to set up but too rigid for what RGFX needs to do. Game events aren't always clean key-value pairs — interceptors often need to decode packed bytes, track state across frames, debounce noisy values, or apply game-specific logic before emitting an event. Transformers need to sequence multiple effects with timing, conditionally choose effects based on game state, or load sprites dynamically.

Lua and JavaScript give you full control over that logic in short, readable scripts — chaining effects with precise timing, reacting differently based on accumulated game state, or animating sprites across your LED matrices in sync with gameplay.

## Do I need to install an MQTT broker?

No. RGFX Hub runs an embedded MQTT broker automatically. Your ESP32 drivers discover it on the network and connect without any configuration.

## Do I need an internet connection?

No. Everything runs locally over your WiFi network. MAME, the Hub, and your ESP32 drivers communicate directly — nothing is sent to the cloud.

## How many LEDs can I run?

Each ESP32 driver can control one strip or matrix. The limit depends on your power supply — each WS2812B LED draws up to 60mA at full white brightness. A USB port can power around 30 LEDs comfortably; larger setups need an external 5V supply. See [Wiring & Power](hardware/wiring.md) for details.

You can run multiple ESP32 drivers simultaneously for separate LED strips or matrices.

## Where are my config files stored?

RGFX stores interceptors, transformers, LED hardware definitions, and driver configurations in a [config directory](getting-started/hub-setup.md#config-directory) on your computer. You can change this location in [Settings](hub-app/settings.md).

---

## Troubleshooting

### My driver doesn't appear in the Hub

| Check | Details |
|-------|---------|
| WiFi credentials | Did you enter the correct network name and password during setup? Reflash WiFi config via USB if needed. |
| Same network | The ESP32 and the computer running RGFX Hub must be on the same local network. Guest networks or VLANs may isolate devices. |
| Hub is running | The Hub's embedded MQTT broker must be running for drivers to connect. Check the [System Status](hub-app/system-status.md) page — the MQTT Broker status should show as active. |
| Firewall | Your computer's firewall may be blocking MQTT (port 1883) or SSDP discovery (port 1900). |
| ESP32 power | Is the ESP32's power LED lit? Try a different USB port or cable. |
| Serial monitor | Connect the ESP32 via USB and check the serial output for connection errors. |

### My LEDs don't respond to effects

| Check | Details |
|-------|---------|
| GPIO pin | Verify the configured GPIO pin matches the physical pin your data wire is connected to. |
| LED count | Make sure the LED hardware definition matches your actual hardware (correct LED count and layout type). |
| Power | Are the LEDs receiving power? Check that the 5V supply is connected and turned on. |
| Data direction | LED strips have a direction — signals flow from DIN to DOUT. Make sure you're connected to the input end. |
| Test pattern | Press the ESP32's **BOOT** button to trigger a test pattern without needing the Hub. If the test pattern works but Hub effects don't, the issue is network-side, not hardware. |
| Brightness | Check that maximum brightness isn't set to 0 in the driver configuration. |

### No events appear when playing a game

| Check | Details |
|-------|---------|
| MAME launch | MAME must be launched with the `-autoboot_script` flag pointing to `rgfx.lua`. See [Configure MAME](getting-started/configure-mame.md). |
| MAME version | RGFX requires MAME 0.250 or later for the Lua plugin API. |
| ROM name | The interceptor matches by ROM name — the filename of your ROM file without the extension (e.g., `pacman.zip` → `pacman`). The framework looks for `{romname}_rgfx.lua` by convention. For ROM variants/clones, check `interceptors/rom_map.json` in your [config directory](getting-started/hub-setup.md#config-directory). |
| Interceptor loading | Check MAME's console output for errors. If the interceptor has a Lua syntax error, MAME will report it. |
| Config directory | Verify the RGFX Config Directory in [Settings](hub-app/settings.md) points to your config directory. |
| Event log | Check that `interceptor-events.log` is being created and updated in your config directory while the game runs. |
| Boot delay | Some interceptors have a boot delay that suppresses events during the power-on self test. Wait for the delay to expire before expecting events. |

### My LEDs flicker or show wrong colors

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Colors are swapped (red shows as green) | Color order mismatch | Change color order in [LED Configuration](hardware/configure.md) (GRB vs RGB) |
| Flickering or random pixels | Data signal integrity | Shorten the data wire, add a level shifter, or check for loose connections |
| LEDs at the far end are dim or discolored | Voltage drop | Inject power at both ends of the strip — see [Wiring & Power](hardware/wiring.md) |
| Only the first few LEDs work | Data line break | Check wiring continuity past the working LEDs |
| Dim flicker at low brightness | Normal LED behavior | Enable **temporal dithering** in driver config, or adjust **floor cutoff** |

### Firmware update fails

| Check | Details |
|-------|---------|
| USB cable | Use a **data** cable, not charge-only. Try a different cable if the serial port doesn't appear. |
| Serial port | Make sure no other application (serial monitor, IDE) has the port open. |
| Boot mode | If USB flash fails, hold the ESP32's **BOOT** button while pressing **RESET** to enter bootloader mode, then try again. |
| OTA timeout | For OTA updates, the driver must be connected and responsive. If it's in a bad state, reflash via USB. |
| Multiple drivers | OTA can update multiple drivers in parallel. If one fails, the others continue independently. |

### Hub application issues

| Symptom | Check |
|---------|-------|
| Hub won't start | Check that no other instance is already running (the MQTT broker binds to a fixed port). |
| Settings don't save | Verify the directories exist on disk. The Hub validates paths before saving. |
| Events processed but no effects | Check that the game has a transformer script. Games with interceptors but no transformer use default effect mappings. |

### macOS: Effects don't reach drivers (EHOSTUNREACH)

On macOS Sequoia (15.x), the Hub may connect to drivers via MQTT but fail to send LED effects over UDP. This happens because macOS requires apps to have **Local Network** permission to send UDP packets to other devices on the network.

When the Hub is launched from the **Applications folder** (double-click), macOS enforces this permission. When launched from **Terminal**, the permission check is bypassed because Terminal is a system app.

**Symptoms:**

- Drivers appear as connected in the Hub
- MQTT commands work (test on/off, config upload)
- LED effects don't reach drivers
- The Hub log (`~/Library/Logs/RGFX Hub/main.log`) shows errors like:
  `UDP send to 192.168.10.x failed: send EHOSTUNREACH`

**Fix:**

1. Open **System Settings → Privacy & Security → Local Network**
2. Find `rgfx-hub` in the list and make sure it is toggled **on**
3. If it was already on, toggle it **off** then back **on** — this resets the permission and resolves a known macOS bug where the permission is granted but not applied

### macOS: "can't be opened because Apple cannot verify the developer"

RGFX Hub is not signed with an Apple Developer certificate. macOS will block the app after downloading. To allow it:

1. Try to open **RGFX Hub** — macOS will show a warning and refuse
2. Open **System Settings → Privacy & Security**
3. Scroll down to the **Security** section — you'll see a message about RGFX Hub being blocked
4. Click **Open Anyway**, then confirm with **Open**

### Serial commands

Connect your ESP32 driver via USB and open a serial monitor at 115200 baud. The following commands are available:

| Command | Description |
|---------|-------------|
| `help` | List available commands |
| `wifi` | Show current WiFi credentials |
| `wifi SSID PASSWORD` | Set WiFi credentials and restart (use quotes for spaces: `wifi "My Network" "My Password"`) |
| `reboot` | Restart the device |
| `reset` | Factory reset — erases all configuration and restarts |
| `telemetry` | Display system info (network, memory, LEDs) as JSON |
| `test_leds on\|off` | Enable or disable the LED test pattern |
| `udp_reset` | Reinitialize the UDP socket |

### Still stuck?

- **LED hardware** — [r/led](https://www.reddit.com/r/led/) for power supplies, wiring, and signal issues
- **ESP32** — [r/esp32](https://www.reddit.com/r/esp32/) for microcontroller and firmware questions
- **MAME** — [r/MAME](https://www.reddit.com/r/MAME/) for general MAME emulation discussion
- **MAME Lua scripting** — the official [MAME Lua scripting docs](https://docs.mamedev.org/luascript/index.html) cover the full API available to interceptors
- **Lua** — [Learn Lua in 15 Minutes](https://tylerneylon.com/a/learn-lua/) or the official [Programming in Lua](https://www.lua.org/pil/1.html) guide
- **JavaScript** — [The Modern JavaScript Tutorial](https://javascript.info/) or [MDN's JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
