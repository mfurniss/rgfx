# Test Your LEDs

Before launching a game, verify your LEDs are responding to commands from the Hub.

## Quick Test

The fastest way to check is the **Test LED** button:

1. Go to **Drivers** in the sidebar
2. Click the **Test LED** button in the Actions column next to your driver
3. Your LEDs should display a colored test pattern

The test pattern shows colored segments (strips) or quadrants (matrices) with a white pixel marking the starting position. See [Test LEDs](../hub-app/test-leds.md) for details on what the patterns mean.

Click **Test LED** again to turn it off.

## Try the FX Playground

The [FX Playground](../hub-app/fx-playground.md) lets you send any effect to your drivers interactively:

1. Go to **FX Playground** in the sidebar
2. Select your driver from the target picker
3. Choose an effect — try **Pulse** for a quick visual hit, or **Plasma** for something continuous
4. Adjust the parameters (color, duration, speed) and click **Trigger Effect**

<!-- TODO: Screenshot of FX Playground -->

Click **Random Trigger** to discover interesting parameter combinations automatically.

## If Your LEDs Don't Respond

| Symptom | Check |
|---------|-------|
| No response at all | Is the driver showing "Connected" (green) on the Drivers page? |
| Still nothing | Verify the GPIO pin number matches the pin your LED data line is connected to |
| Only first few LEDs light up | Data signal integrity issue — try a shorter wire or add a level shifter |
| Wrong colors | Color order setting may need adjustment (GRB vs RGB) |

For more help, see [Troubleshooting](../faq.md#troubleshooting).

## Next Step

[Play a game :material-arrow-right:](play.md)
