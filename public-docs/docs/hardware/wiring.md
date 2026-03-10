# Wiring & Power

Getting your LEDs connected to an ESP32 is straightforward. This page covers basic wiring and power considerations.

## Basic Wiring

An addressable LED strip needs three connections from the ESP32:

1. **DATA** — GPIO pin to the LED strip's data-in line
2. **GND** — common ground between ESP32 and LEDs
3. **5V** — power for the LEDs

The ESP32's onboard 5V pin is the recommended connection point for powering your LEDs. It cleanly routes power from your supply through the breakout board to both the ESP32 and the LED hardware.

### GPIO Pin

RGFX uses a single data pin to drive all connected LEDs. The default is GPIO 16, but you can configure any valid GPIO pin (0-48 depending on your ESP32 variant) in the driver settings. This single-pin approach keeps wiring simple — one data wire from the ESP32 to the first LED in the chain.

### Data Direction

LED strips have a data direction — signals flow from data-in to data-out. Make sure you connect the ESP32's data pin to the **input** end of the strip (usually marked with an arrow showing signal direction, or labeled "DIN").

## Power

USB power is fine for most setups. If you need more power, use an external 5V power supply connected to the 5V and GND pins on your ESP32 breakout board.

!!! tip
    RGFX's driver firmware includes a **max power (mA) setting** that dynamically scales brightness to stay within your power supply's capacity. Always configure this limit to match your actual power supply.

!!! info "Larger builds"
    For setups with long LED strips, LED matrices, or high LED counts, you may need power injection, level shifting, or higher-capacity power supplies. The [r/led](https://www.reddit.com/r/led/), [r/FastLED](https://www.reddit.com/r/FastLED/), and [r/esp32](https://www.reddit.com/r/esp32/) subreddits are excellent resources for advanced wiring guidance.

## Next Steps

- [Configure your LED hardware](configure.md) in the Hub
