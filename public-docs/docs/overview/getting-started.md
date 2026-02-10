# Getting Started

This guide walks you through setting up RGFX from scratch. By the end you'll have LED effects reacting to a game running in MAME.

## 1. Install MAME

Download and install [MAME](../overview/requirements.md) version 0.250 or later. Place your ROM files in a known directory.

## 2. Launch RGFX Hub

Open the RGFX Hub application. On first launch it copies default [interceptor](../interceptors/index.md) and [transformer](../transformers/index.md) scripts to `~/.rgfx/`.

Go to [Settings](../hub-app/settings.md) and configure:

- **RGFX Config Directory** — leave as the default `~/.rgfx` unless you have a reason to change it
- **MAME ROMs Directory** — point this to the folder containing your ROM files

## 3. Set Up an ESP32 Driver

Connect an [ESP32 board](../overview/requirements.md) to your computer via USB.

1. Open the [Firmware](../hub-app/firmware.md) page and select **USB Serial**
2. Choose the serial port and click **Update Firmware**
3. After flashing, click **Configure WiFi** and enter your network credentials
4. The ESP32 reboots and joins your WiFi network

Once connected, the driver appears on the [Drivers](../hub-app/drivers.md) page.

## 4. Configure LED Hardware

Click on your driver in the Drivers list, then click **Configure Driver**.

Select your [LED hardware](../drivers/configure-leds.md) definition, set the GPIO pin, and adjust brightness and power limits to match your setup. Click **Save Configuration** to push the settings to the driver.

## 5. Test the LEDs

Use the [FX Playground](../hub-app/fx-playground.md) to send effects to your driver and verify everything is working. Try a pulse or plasma effect to confirm the LEDs respond.

## 6. Play a Game

Launch a supported game in MAME. The Hub's [Games](../hub-app/games.md) page shows which ROMs have interceptors and transformers configured.

As you play, the interceptor monitors game state and emits events. The transformer converts those events into [visual effects](../drivers/effects.md) and broadcasts them to your drivers in real-time.

## Next Steps

- [Write your own interceptor](../interceptors/writing-interceptors.md) for a game that isn't supported yet
- Create a custom [transformer](../transformers/index.md) to fine-tune how events map to effects
- Add more drivers to expand your setup with additional LED strips and matrices
