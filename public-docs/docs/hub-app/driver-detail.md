# Driver Detail

The Driver Detail page shows everything about a single ESP32 driver — its LED configuration, network status, hardware specs, and real-time performance. Access it by clicking any row in the [Drivers](drivers.md) list.

![RGFX Hub — Driver Detail page](../assets/images/rgfx-hub-driver-detail.png)

## Status

Basic identification and state:

- **Description** - User-assigned description
- **Status** - Enabled or disabled
- **Remote Logging** - Remote log level (All Messages, Errors Only, Off)
- **Update Rate** - Effect update frequency (Hz)
- **Failed Heartbeats** - Missed heartbeat count (shown when > 0)

## Network

Network connectivity and communication:

- **IP Address** - Current network address
- **MAC Address** - Hardware identifier
- **Hostname** - mDNS hostname
- **SSID** - Connected WiFi network
- **WiFi Signal** - RSSI signal strength with quality rating
- **Discovery Method** - How the driver found the broker (mDNS, SSDP, etc.)
- **MQTT Messages Received** - Total messages received
- **MQTT Errors** - Message error count

## Hardware

ESP32 chip specifications:

- **Chip Model** - ESP32, ESP32-S3, etc.
- **Chip Revision** - Hardware revision
- **CPU Cores** - Number of processor cores
- **CPU Frequency** - Clock speed
- **Flash Size / Speed** - Storage capacity and bus speed
- **Firmware Version** - Currently installed firmware

## LED Hardware

Displays the selected LED hardware definition for this driver, including the hardware type and configuration source file.

## LED Configuration

Shows the driver's LED settings:

- **Data Pin** - GPIO pin connected to LED strip/matrix
- **Actual Dimensions** - Resolved LED width and height
- **Total LED Count** - Number of addressable LEDs
- **Max Brightness** - Per-LED brightness limit (0-255)
- **Brightness Limit** - Global brightness cap (0-255)
- **Dithering** - Temporal dithering enabled/disabled
- **Gamma Correction** - Per-channel gamma values
- **Floor Cutoff** - Per-channel minimum threshold
- **Multi-Panel Layout** - Panel arrangement (matrices only)
- **Panel Rotation** - Single-panel rotation (matrices only)
- **LED Offset** - Starting index offset
- **Reverse Direction** - Whether LED order is reversed (strips only)
- **Power Supply** - Voltage and max power (mA) settings

## Telemetry

Real-time performance metrics:

- **Frame Rate** - Current FPS with min/max range
- **Frame Timing** - Render timing breakdown (microseconds)
- **Last Reset Reason** - Why the driver last rebooted
- **Crash Count** - Number of crashes since flash
- **Driver Uptime** - Time since last reboot
- **Memory** - Free heap, min free heap, max allocatable, PSRAM
- **Telemetry Events** - Total telemetry events received
- **Last Updated** - Timestamp of last telemetry report

## Actions

Available actions for the driver:

- **Test LED** - Toggle LED test pattern to verify the driver is communicating and LEDs are working. See [Test LEDs](../getting-started/test-leds.md) for details.
- **Configure Driver** - Edit driver settings (see [LED Configuration](../hardware/configure.md))
- **Open Driver Log** - View logs from this specific driver
- **Reset** - Factory reset (erases ID, LED config, WiFi)
- **Restart** - Reboot the driver
- **Disable/Enable** - Toggle driver participation
- **Delete** - Remove driver from Hub
