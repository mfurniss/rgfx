# RGFX Driver Enclosure - Wiring Diagram

Complete wiring diagram for the RGFX Driver enclosure with external 5V power supply supporting 64+ LEDs.

## Overview

This design uses:
- **External 5V 5A power supply** (barrel jack input) for LED strips and ESP32
- **100×160mm perfboard** for component mounting and power distribution
- **4 screw terminal outputs** for LED strips (GPIO 16, 17, 18, 19)
- **OLED display** (optional) on I2C (GPIO 21, 22)
- **Hammond 1554 enclosure** or similar plastic case

---

## Back Panel Layout

```
┌─────────────────────────────────────────────────┐
│                BACK PANEL                       │
│                                                 │
│  Power Input:                                   │
│  ┏━━━━━━━━━━━━━━┓                               │
│  ┃ ⚡ DC 5V 5A  ┃  ← Barrel jack 5.5×2.1mm      │
│  ┃   Barrel In  ┃     (center positive)         │
│  ┗━━━━━━━━━━━━━━┛                               │
│                                                 │
│  Programming/Debug (Optional):                  │
│  ┌──────────────┐                               │
│  │   USB-C      │  ← For firmware updates only  │
│  └──────────────┘                               │
│                                                 │
│  LED Outputs (Screw Terminals 3-pin):           │
│                                                 │
│  OUT-1 (GPIO 16):                               │
│  ┌──────┬──────┬──────┐                         │
│  │ GND  │ DATA │ +5V  │                         │
│  └──────┴──────┴──────┘                         │
│                                                 │
│  OUT-2 (GPIO 17):                               │
│  ┌──────┬──────┬──────┐                         │
│  │ GND  │ DATA │ +5V  │                         │
│  └──────┴──────┴──────┘                         │
│                                                 │
│  OUT-3 (GPIO 18):                               │
│  ┌──────┬──────┬──────┐                         │
│  │ GND  │ DATA │ +5V  │                         │
│  └──────┴──────┴──────┘                         │
│                                                 │
│  OUT-4 (GPIO 19):                               │
│  ┌──────┬──────┬──────┐                         │
│  │ GND  │ DATA │ +5V  │                         │
│  └──────┴──────┴──────┘                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Top Panel Layout

```
┌─────────────────────────────────────────────────┐
│                  TOP PANEL                      │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │        128×64 OLED Display Window         │  │
│  │         (130×66mm cutout)                 │  │
│  │                                           │  │
│  │   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │  │
│  │   ┃                                 ┃   │  │
│  │   ┃     RGFX Driver Status          ┃   │  │
│  │   ┃     WiFi: Connected             ┃   │  │
│  │   ┃     MQTT: Connected             ┃   │  │
│  │   ┃     Up: 01:23:45                ┃   │  │
│  │   ┃                                 ┃   │  │
│  │   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Perfboard Layout (100×160mm)

### Component Placement - Top View

```
                    Barrel Jack Input
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │  Power Input Section:                                      │
    │  ┌──────┐  ┌────────────┐                                  │
    │  │ FUSE │──│ 1000µF Cap │─────┐                            │
    │  │ 5A   │  │   16V      │     │                            │
    │  └──────┘  └────────────┘     │                            │
    │      │           │             │                            │
    │      └───────────┴─────────────┼──── 5V+ BUS ══════════════╗
    │                                │    (thick red wire/trace) ║
    │                                                             ║
    │  ESP32 DevKit (Mounted Vertically):                         ║
    │  ┌────────────────────────────────┐                        ║
    │  │                                │                        ║
    │  │  ┌──┐ ESP32-WROOM-32           │                        ║
    │  │  │  │                           │                        ║
    │  │  └──┘                           │                        ║
    │  │                                │                        ║
    │  │  VIN ────────────────────────────────────────────────────╢
    │  │  GND ────────────────────────────────────────┐           ║
    │  │                                │             │           ║
    │  │  GPIO 21 (SDA) ───┐            │             │           ║
    │  │  GPIO 22 (SCL) ───┼────────────┤             │           ║
    │  │                   │            │             │           ║
    │  │  GPIO 16 ─────────┼────────────┼───── OUT-1  │           ║
    │  │  GPIO 17 ─────────┼────────────┼───── OUT-2  │           ║
    │  │  GPIO 18 ─────────┼────────────┼───── OUT-3  │           ║
    │  │  GPIO 19 ─────────┼────────────┼───── OUT-4  │           ║
    │  │                   │            │             │           ║
    │  └───────────────────┼────────────┘             │           ║
    │                      │                          │           ║
    │  OLED Display (I2C): │                          │           ║
    │  ┌──────────────┐    │                          │           ║
    │  │ 128×64 SSD   │    │                          │           ║
    │  │ 1306 OLED    │    │                          │           ║
    │  ├──────────────┤    │                          │           ║
    │  │ VCC ─────────┼────┼──────────────────────────┼───────────╢
    │  │ GND ─────────┼────┼──────────────────────────┤           ║
    │  │ SDA ─────────┘    │                          │           ║
    │  │ SCL ──────────────┘                          │           ║
    │  └──────────────┘                               │           ║
    │                                                  │           ║
    │  Output Terminals (Panel Mount):                │           ║
    │                                                  │           ║
    │  Terminal Block 1 (GPIO 16):                    │           ║
    │  ┌──────┬──────┬──────┐                         │           ║
    │  │ GND ─┼──────┼──────┼─────────────────────────┤           ║
    │  │ DATA │ GP16 │      │  ← from ESP32           │           ║
    │  │ +5V ─┼──────┼──────┼─────────────────────────┼───────────╢
    │  └──────┴──────┴──────┘                         │           ║
    │                                                  │           ║
    │  Terminal Block 2 (GPIO 17):                    │           ║
    │  ┌──────┬──────┬──────┐                         │           ║
    │  │ GND ─┼──────┼──────┼─────────────────────────┤           ║
    │  │ DATA │ GP17 │      │  ← from ESP32           │           ║
    │  │ +5V ─┼──────┼──────┼─────────────────────────┼───────────╢
    │  └──────┴──────┴──────┘                         │           ║
    │                                                  │           ║
    │  Terminal Block 3 (GPIO 18):                    │           ║
    │  ┌──────┬──────┬──────┐                         │           ║
    │  │ GND ─┼──────┼──────┼─────────────────────────┤           ║
    │  │ DATA │ GP18 │      │  ← from ESP32           │           ║
    │  │ +5V ─┼──────┼──────┼─────────────────────────┼───────────╢
    │  └──────┴──────┴──────┘                         │           ║
    │                                                  │           ║
    │  Terminal Block 4 (GPIO 19):                    │           ║
    │  ┌──────┬──────┬──────┐                         │           ║
    │  │ GND ─┼──────┼──────┼─────────────────────────┤           ║
    │  │ DATA │ GP19 │      │  ← from ESP32           │           ║
    │  │ +5V ─┼──────┼──────┼─────────────────────────┼───────────╢
    │  └──────┴──────┴──────┘                         │           ║
    │                                                  │           ║
    │  GND BUS (thick black wire/trace) ══════════════╧═══════════╝
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

---

## Power Distribution Schematic

```
5V 5A Power Supply (Barrel Jack)
         │
         │ (Red 18AWG wire)
         ▼
    ┌─────────┐
    │  Fuse   │  5A Blade Fuse
    │   5A    │  (Automotive style)
    └────┬────┘
         │
         ▼
    ┌─────────────┐
    │  Capacitor  │  1000µF 16V Electrolytic
    │   1000µF    │  (Smooths voltage spikes)
    │    16V      │
    └──────┬──────┘
           │
           ├──────────────────────────────────── 5V+ BUS ───┐
           │                                                 │
           ├──── ESP32 VIN                                   │
           │                                                 │
           ├──── OLED VCC                                    │
           │                                                 │
           ├──── Terminal 1 (+5V pin)                        │
           ├──── Terminal 2 (+5V pin)                        │
           ├──── Terminal 3 (+5V pin)                        │
           └──── Terminal 4 (+5V pin)                        │
                                                             │
GND (from barrel jack, black 18AWG wire)                     │
           │                                                 │
           └──────────────────────────────────── GND BUS ────┤
                                                             │
           ┌─── ESP32 GND                                    │
           ├─── OLED GND                                     │
           ├─── Terminal 1 (GND pin)                         │
           ├─── Terminal 2 (GND pin)                         │
           ├─── Terminal 3 (GND pin)                         │
           └─── Terminal 4 (GND pin)                         │
                                                             │
           ┌─────────────────────────────────────────────────┘
           │
    Common GND (critical for data signal integrity!)
```

---

## Wire Routing and Color Codes

### Power Wiring

| Connection | Wire Color | Wire Gauge | Length | Notes |
|------------|------------|------------|--------|-------|
| Barrel Jack (+) to Fuse | Red | 18 AWG | 50mm | High current |
| Fuse to Capacitor (+) | Red | 18 AWG | 50mm | High current |
| Capacitor (+) to 5V Bus | Red | 18 AWG | 100mm | Main power distribution |
| 5V Bus to ESP32 VIN | Red | 22 AWG | 80mm | ESP32 power |
| 5V Bus to OLED VCC | Red | 24 AWG | 60mm | Display power |
| 5V Bus to Terminal 1-4 | Red | 18 AWG | varies | LED power |
| Barrel Jack (-) to GND Bus | Black | 18 AWG | 50mm | High current ground |
| GND Bus to ESP32 GND | Black | 22 AWG | 80mm | ESP32 ground |
| GND Bus to OLED GND | Black | 24 AWG | 60mm | Display ground |
| GND Bus to Terminal 1-4 | Black | 18 AWG | varies | LED ground |

### Signal Wiring (GPIO to Terminals)

| Connection | Wire Color | Wire Gauge | Length | Notes |
|------------|------------|------------|--------|-------|
| GPIO 16 to Terminal 1 DATA | Yellow | 22 AWG | 100mm | LED data signal |
| GPIO 17 to Terminal 2 DATA | Orange | 22 AWG | 100mm | LED data signal |
| GPIO 18 to Terminal 3 DATA | Green | 22 AWG | 100mm | LED data signal |
| GPIO 19 to Terminal 4 DATA | Blue | 22 AWG | 100mm | LED data signal |
| GPIO 21 (SDA) to OLED SDA | White | 24 AWG | 60mm | I2C data |
| GPIO 22 (SCL) to OLED SCL | Gray | 24 AWG | 60mm | I2C clock |

---

## Component Mounting Details

### Perfboard Standoffs

Mount perfboard to enclosure floor using **M3 brass standoffs**:

```
Standoff placement (viewed from above):

    ┌─────────────────────────────────┐
    │ ●                             ● │  ← M3 standoff locations
    │                                 │    (8-10mm height)
    │                                 │
    │         [Perfboard Area]        │
    │                                 │
    │                                 │
    │ ●                             ● │
    └─────────────────────────────────┘
```

**Hardware per standoff:**
- M3 × 8mm brass standoff (female-female)
- M3 × 6mm pan head screw (bottom, into enclosure)
- M3 × 6mm pan head screw (top, through perfboard)

### ESP32 DevKit Mounting

Mount ESP32 vertically using:
- **Option A**: Female header pins soldered to perfboard, ESP32 plugs in (removable)
- **Option B**: Male header pins soldered directly (permanent)

**Recommended: Option A (removable) for easier debugging/replacement**

```
Side view:
    ESP32 DevKit
    ┌──────────┐
    │          │
    │   Chip   │  ← ESP32 standing vertical
    │          │
    └────┬┬┬┬┬─┘
         │││││
    ─────┴┴┴┴┴─── Perfboard (female headers)
```

### OLED Display Mounting

Mount OLED to top panel:
- Cut **130×66mm rectangular window** in top panel
- Secure display with:
  - **Option A**: M2 screws through corner mounting holes (if available)
  - **Option B**: Foam double-sided tape (easier, removable)

Connect to perfboard using **4-pin JST SM connector** (removable) or direct solder.

---

## Critical Safety Notes

### Power Safety

1. **Fuse is MANDATORY**
   - Use 5A blade fuse (automotive style)
   - Install fuse holder on perfboard
   - Protects against shorts and overcurrent

2. **Capacitor Polarity**
   - Electrolytic capacitors have polarity!
   - Negative stripe (-) goes to GND
   - Positive lead (+) goes to 5V+
   - **Installing backwards will cause explosion!**

3. **Common Ground**
   - ESP32 GND and LED power GND MUST be connected
   - Without common ground, data signals won't work
   - All grounds must tie to the same GND bus

4. **Wire Gauge**
   - Use 18 AWG minimum for power buses (5V+, GND)
   - Thinner wire will overheat with high current
   - 22-24 AWG acceptable for signal wires only

### Electrical Safety

1. **Barrel Jack Polarity**
   - Standard: **CENTER POSITIVE** (+)
   - Verify your power supply matches!
   - Wrong polarity will destroy ESP32 and LEDs

2. **Voltage Verification**
   - Use multimeter to verify 5V before connecting ESP32
   - Measure between 5V+ bus and GND bus
   - Should read 4.9-5.1V DC

3. **Insulation**
   - Use heat shrink tubing on all exposed connections
   - Keep bare wires away from enclosure walls
   - Prevent shorts between components

---

## Testing Procedure

### Before Powering On

1. **Visual Inspection**
   - Check all solder joints for bridges
   - Verify no loose wire strands
   - Confirm capacitor polarity (stripe to GND)
   - Ensure fuse is installed

2. **Continuity Testing**
   - Use multimeter in continuity mode
   - Verify GND bus connects to all ground points
   - Verify 5V+ bus connects to all power points
   - **Confirm NO continuity between 5V+ and GND** (would indicate short!)

3. **Resistance Check**
   - Measure resistance between 5V+ and GND
   - Should read >10kΩ (high resistance)
   - Low resistance (<100Ω) indicates short circuit

### Initial Power-Up

1. **Without ESP32 or OLED installed**
   - Connect 5V power supply
   - Measure voltage at 5V+ bus: should be 4.9-5.1V
   - Measure voltage at each terminal output: should be 4.9-5.1V
   - If incorrect, DISCONNECT and troubleshoot

2. **With ESP32 installed (no LEDs connected)**
   - Install ESP32 into headers
   - Power on
   - ESP32 should boot (LEDs on board may flash)
   - Check for overheating components
   - If ESP32 doesn't boot, DISCONNECT and troubleshoot

3. **With OLED installed**
   - Connect OLED display
   - Power on
   - Display should show boot screen
   - If display blank, check I2C connections (SDA, SCL)

4. **With LED strips connected**
   - Connect one LED strip to OUT-1
   - Power on
   - LEDs should light (blue during WiFi setup)
   - If LEDs don't light, check DATA signal and power
   - Gradually add remaining LED strips

### Current Draw Verification

Use clamp meter or inline current meter to verify total current draw:

| Scenario | Expected Current | Action if Higher |
|----------|-----------------|------------------|
| ESP32 only (no LEDs) | 150-300mA | Check for short circuit |
| ESP32 + OLED | 170-320mA | Check display power |
| + 32 LEDs (typical) | 1-2A | Normal operation |
| + 64 LEDs (typical) | 2-3.5A | Normal operation |
| Any scenario | >5A | Fuse should blow - CHECK FOR SHORT! |

---

## Troubleshooting

### ESP32 Won't Boot

- **Check VIN voltage**: Should be 4.9-5.1V
- **Check GND connection**: Must be solid
- **Try USB-C power**: If works, issue with barrel jack power
- **Inspect for shorts**: Between VIN and GND pins

### OLED Display Blank

- **Check I2C connections**: SDA (GPIO 21), SCL (GPIO 22)
- **Verify 3.3V or 5V power**: Depends on OLED module (check datasheet)
- **Try I2C scanner code**: Detect if display present at 0x3C
- **Check pullup resistors**: May need 4.7kΩ on SDA and SCL

### LEDs Don't Light

- **Check +5V at terminal**: Should be 4.9-5.1V
- **Check GND connection**: Must be solid
- **Verify GPIO data signal**: Use logic analyzer or oscilloscope
- **Test LED strip**: Connect directly to known-good power source
- **Check FastLED configuration**: Ensure correct GPIO pin in firmware

### LEDs Flicker

- **Increase capacitor**: Try 2200µF or parallel capacitors
- **Check wire gauge**: Use thicker wire for power (18 AWG minimum)
- **Reduce LED brightness**: Lower in firmware to reduce current spikes
- **Add power injection**: For strips >30 LEDs, inject power at both ends

### Fuse Keeps Blowing

- **SHORT CIRCUIT!** Disconnect immediately
- **Check for wire strands**: Between 5V+ and GND
- **Inspect solder joints**: For bridges
- **Verify LED strip polarity**: Wrong polarity can cause shorts
- **Measure resistance**: Between 5V+ and GND (should be >10kΩ)

---

## Next Steps

After completing the wiring, proceed to:
1. **Assembly Guide** - Step-by-step assembly instructions
2. **BOM** - Purchase specific components
3. **Pinout Reference** - Connect your LED strips correctly

