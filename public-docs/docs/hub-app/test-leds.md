# Test LEDs

The Test LEDs feature is the quickest way to verify that a driver is communicating and its LED hardware is working correctly.

## How It Works

When you toggle test mode on, the Hub sends a command to the driver which displays a static test pattern. The pattern remains active until you toggle test mode off. This allows you to:

- Verify the driver is receiving commands from the Hub
- Confirm the LED data pin is correctly configured
- Check that all LEDs are responsive
- Validate the color order setting is correct
- Identify the start position and panel origins

## Triggering a Test

### From the Hub

Click the **Test LEDs** button to toggle test mode on or off. The button appears:

- In the **Actions** column on the [Drivers](drivers.md) list
- In the **Actions** section on the [Driver Detail](driver-detail.md) page

The button shows **Test LEDs ON** (green) when active, or **Test LEDs OFF** when inactive.

### From the ESP32

Press the **BOOT** button on the ESP32 to toggle test mode directly on the device. This is useful for verifying LED hardware without needing the Hub connected, such as during initial hardware setup or troubleshooting.

## Test Patterns

The test pattern varies based on the LED hardware layout.

### Strip Layout

Strips display 4 colored segments (25% each) with a white pixel marking the start:

<div class="led-test-strip">
  <div class="start-pixel"></div>
  <div class="segment seg-red"></div>
  <div class="segment seg-green"></div>
  <div class="segment seg-cyan"></div>
  <div class="segment seg-purple"></div>
</div>

| Segment | Color |
|---------|-------|
| Start pixel | White |
| 1st quarter | Red |
| 2nd quarter | Green |
| 3rd quarter | Cyan |
| 4th quarter | Purple |

If the white pixel appears at the wrong end, enable the **Reverse** setting in [LED Configuration](../hardware/configure.md).

### Single Matrix Layout

A single matrix displays 4 colored quadrants with a white pixel marking the top-left origin:

<div class="led-test-matrix">
  <div class="quadrant quad-tl"><div class="origin-pixel"></div></div>
  <div class="quadrant quad-tr"></div>
  <div class="quadrant quad-bl"></div>
  <div class="quadrant quad-br"></div>
</div>

| Quadrant | Color |
|----------|-------|
| Top-left | Red (with white origin pixel) |
| Top-right | Green |
| Bottom-left | Cyan |
| Bottom-right | Purple |

If the white origin pixel appears in the wrong corner, adjust the **Rotation** setting in [LED Configuration](../hardware/configure.md).

### Multi-Panel Matrix

For multi-panel configurations, the quadrant pattern spans the entire display as one unified image. Each individual panel has a white origin pixel in its top-left corner:

<div class="led-test-multipanel">
  <div class="panel panel-tl"><div class="origin-pixel"></div></div>
  <div class="panel panel-tc"><div class="origin-pixel"></div></div>
  <div class="panel panel-tr"><div class="origin-pixel"></div></div>
  <div class="panel panel-bl"><div class="origin-pixel"></div></div>
  <div class="panel panel-bc"><div class="origin-pixel"></div></div>
  <div class="panel panel-br"><div class="origin-pixel"></div></div>
</div>

The white origin pixels on each panel help verify panel orientation and ordering in multi-panel setups.

## Troubleshooting

| Symptom | Likely Cause |
|---------|--------------|
| Colors appear in wrong order (e.g., blue instead of red) | Color order setting needs adjustment |
| Some LEDs don't illuminate | Dead LEDs or wiring issue |
| Only first few LEDs work | Data signal integrity problem |
| Origin pixel in wrong corner | Panel rotation setting incorrect |
| Panels in wrong positions | Panel order configuration incorrect |

## Requirements

**From the Hub:**

- Driver must be **Connected** (green status)
- LED hardware must be configured on the driver

**From the ESP32 BOOT button:**

- LED hardware must be configured on the driver
- No Hub connection required

## See Also

- [Build Examples](../hardware/examples.md) - Photos of test patterns on real LED matrix builds
