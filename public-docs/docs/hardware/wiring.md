# Wiring & Power

Getting your LEDs connected to an ESP32 is straightforward. This page covers basic wiring and power considerations.

## Basic Wiring

An addressable LED strip needs three connections from the ESP32:

1. **DATA** — GPIO pin to the LED strip's data-in line
2. **GND** — common ground between ESP32 and LEDs
3. **5V** — power for the LEDs

The ESP32's onboard 5V pin is the recommended connection point for powering your LEDs. It cleanly routes power from your supply through the breakout board to both the ESP32 and the LED hardware.

### GPIO Pin

RGFX uses a single data pin to drive all connected LEDs. The default is GPIO 16, but you can configure any valid GPIO pin (0-39) in the driver settings. This single-pin approach keeps wiring simple — one data wire from the ESP32 to the first LED in the chain.

### Data Direction

LED strips have a data direction — signals flow from data-in to data-out. Make sure you connect the ESP32's data pin to the **input** end of the strip (usually marked with an arrow showing signal direction, or labeled "DIN").

## Power

The power supply you need depends on how many LEDs you're driving. Each WS2812B LED can draw up to ~60mA at full white brightness:

| LEDs | Max Current | Power Supply |
|------|------------|-------------|
| 30 | ~1.8A | USB is usually fine |
| 60 | ~3.6A | 5V 4A supply |
| 100 | ~6A | 5V 8A supply |
| 256 (16x16 matrix) | ~15A | 5V 20A supply |

For small setups, USB power alone is sufficient. For larger builds, use an external 5V power supply connected to the breakout board — the 5V pin distributes power to both the ESP32 and the LEDs.

!!! tip
    In practice, effects rarely drive all LEDs at full white simultaneously. RGFX's driver firmware includes a **max power (mA) setting** that dynamically scales brightness to stay within your power supply's capacity. Always configure this limit to match your actual power supply.

### Power Injection

For long strips (100+ LEDs), voltage drop along the strip can cause LEDs at the far end to appear dimmer or discolored. Injecting power at both ends — or at intervals along the strip — solves this. Connect additional 5V and GND wires from your power supply to power pads further along the strip.

## Level Shifters

The ESP32 outputs 3.3V logic, while WS2812B LEDs expect 5V signals. For short data wire runs, this usually works fine without any conversion. If you experience flickering or unreliable behavior — especially with longer data wires — a logic level shifter between the ESP32 and the first LED can help.

## Next Steps

- [Configure your LED hardware](configure.md) in the Hub
- View [Build Examples](examples.md) to see real wiring setups
