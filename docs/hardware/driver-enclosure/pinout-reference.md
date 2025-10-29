# RGFX Driver Enclosure - Connector Pinout Reference

Quick reference guide for connecting LED strips and understanding the RGFX Driver enclosure pinouts.

---

## Quick Reference Card

**Print this section and keep it with your enclosure!**

```
╔══════════════════════════════════════════════════════════╗
║        RGFX DRIVER ENCLOSURE - PINOUT REFERENCE         ║
╚══════════════════════════════════════════════════════════╝

POWER INPUT:
┌────────────────────────────────┐
│ Barrel Jack: 5V DC, 5A         │
│ Polarity: CENTER POSITIVE (+)  │
│ Size: 5.5mm × 2.1mm            │
└────────────────────────────────┘

LED OUTPUTS (Screw Terminals):
Each output has 3 pins: [GND] [DATA] [+5V]

OUT-1 (GPIO 16):         OUT-2 (GPIO 17):
┌──────┬──────┬──────┐   ┌──────┬──────┬──────┐
│ GND  │ DATA │ +5V  │   │ GND  │ DATA │ +5V  │
│ BLK  │ YEL  │ RED  │   │ BLK  │ ORG  │ RED  │
└──────┴──────┴──────┘   └──────┴──────┴──────┘

OUT-3 (GPIO 18):         OUT-4 (GPIO 19):
┌──────┬──────┬──────┐   ┌──────┬──────┬──────┐
│ GND  │ DATA │ +5V  │   │ GND  │ DATA │ +5V  │
│ BLK  │ GRN  │ RED  │   │ BLK  │ BLU  │ RED  │
└──────┴──────┴──────┘   └──────┴──────┴──────┘

LED STRIP CONNECTION (typical WS2812B):
Strip Wire → Terminal Pin
Red    → +5V (right pin)
White/Green → DATA (center pin)
Black  → GND (left pin)

VOLTAGE SPECIFICATIONS:
- Input:  5V DC ±5% (4.75-5.25V)
- Output: 5V DC (to LED strips)
- Max Current: 5A total (shared across all outputs)

GPIO ASSIGNMENTS:
- GPIO 16 → OUT-1 (Yellow wire)
- GPIO 17 → OUT-2 (Orange wire)
- GPIO 18 → OUT-3 (Green wire)
- GPIO 19 → OUT-4 (Blue wire)
- GPIO 21 → I2C SDA (OLED display)
- GPIO 22 → I2C SCL (OLED display)
```

---

## Detailed Terminal Pinouts

### Terminal Block Layout

All terminal blocks use the **same pin arrangement** (viewed from back of enclosure):

```
Pin Positions (left to right):
┌──────┬──────┬──────┐
│  1   │  2   │  3   │
│ GND  │ DATA │ +5V  │
└──────┴──────┴──────┘
```

**Pin 1 (Left)**: Ground (GND) - Black wire
**Pin 2 (Center)**: Data Signal - Colored wire (varies by output)
**Pin 3 (Right)**: Power (+5V) - Red wire

---

### OUT-1 (GPIO 16)

```
Terminal: OUT-1
GPIO: 16
Internal Wire Color: Yellow

┌──────┬──────┬──────┐
│ GND  │ GPIO │ +5V  │
│      │  16  │      │
└──────┴──────┴──────┘
   │      │      │
   │      │      └─── +5V DC output (max 5A shared)
   │      └────────── LED data signal (3.3V logic)
   └───────────────── Ground reference
```

**Use case**: First LED device (e.g., marquee lights, player 1 buttons)

**Connection example (WS2812B strip):**
- Strip RED wire → +5V (pin 3)
- Strip WHITE/GREEN wire → DATA (pin 2)
- Strip BLACK wire → GND (pin 1)

---

### OUT-2 (GPIO 17)

```
Terminal: OUT-2
GPIO: 17
Internal Wire Color: Orange

┌──────┬──────┬──────┐
│ GND  │ GPIO │ +5V  │
│      │  17  │      │
└──────┴──────┴──────┘
   │      │      │
   │      │      └─── +5V DC output (max 5A shared)
   │      └────────── LED data signal (3.3V logic)
   └───────────────── Ground reference
```

**Use case**: Second LED device (e.g., side panel lights, player 2 buttons)

---

### OUT-3 (GPIO 18)

```
Terminal: OUT-3
GPIO: 18
Internal Wire Color: Green

┌──────┬──────┬──────┐
│ GND  │ GPIO │ +5V  │
│      │  18  │      │
└──────┴──────┴──────┘
   │      │      │
   │      │      └─── +5V DC output (max 5A shared)
   │      └────────── LED data signal (3.3V logic)
   └───────────────── Ground reference
```

**Use case**: Third LED device (e.g., coin slot lights, cabinet underglow)

---

### OUT-4 (GPIO 19)

```
Terminal: OUT-4
GPIO: 19
Internal Wire Color: Blue

┌──────┬──────┬──────┐
│ GND  │ GPIO │ +5V  │
│      │  19  │      │
└──────┴──────┴──────┘
   │      │      │
   │      │      └─── +5V DC output (max 5A shared)
   │      └────────── LED data signal (3.3V logic)
   └───────────────── Ground reference
```

**Use case**: Fourth LED device (e.g., speaker lights, additional effects)

---

## Power Specifications

### Input Power

**Barrel Jack Input:**
- Voltage: 5V DC ±5%
- Current: 5A maximum
- Polarity: **CENTER POSITIVE** (+)
- Connector: 5.5mm outer diameter × 2.1mm inner diameter
- Fuse Protection: 5A blade fuse (ATO/ATC type)

**⚠️ WARNING**: Using wrong polarity (center negative) will damage the ESP32 and LEDs!

**Power Supply Requirements:**
- AC input: 100-240V (universal)
- DC output: 5V, 5A (25W minimum)
- Recommended: ALITOVE 5V 5A or equivalent
- Cable length: 1.5m minimum for flexibility

### Output Power (Per Terminal)

**Total Power Budget: 25W (5V × 5A)**

Power is **shared across all 4 terminals**:
- Each terminal provides: 5V DC
- Combined max current: 5A total (not 5A per terminal!)
- Fuse protection: 5A (blows if total exceeds)

**Power Distribution Examples:**

| Scenario | OUT-1 | OUT-2 | OUT-3 | OUT-4 | Total | Safe? |
|----------|-------|-------|-------|-------|-------|-------|
| Small setup | 0.5A | 0.5A | 0.5A | 0.5A | 2A | ✅ YES |
| Medium setup | 1.2A | 1.2A | 1.2A | 0A | 3.6A | ✅ YES |
| Large setup | 1.5A | 1.5A | 1.5A | 1.5A | 6A | ❌ NO - Exceeds 5A! |
| Max single | 4.5A | 0A | 0A | 0A | 4.5A | ✅ YES (but risky) |

**Current Calculation for LEDs:**

```
Per LED current draw (WS2812B):
- Full white (max brightness): ~60mA
- Typical colors (medium brightness): ~20-40mA
- Off (black): ~1mA

Examples:
- 8 LEDs at medium brightness: 8 × 30mA = 240mA
- 16 LEDs at medium brightness: 16 × 30mA = 480mA
- 32 LEDs at medium brightness: 32 × 30mA = 960mA
- 64 LEDs at medium brightness: 64 × 30mA = 1.92A
```

**Safe LED Counts** (at typical brightness across all outputs):
- Conservative (60mA per LED): ~80 LEDs total
- Typical (30mA per LED): ~160 LEDs total
- Low brightness (20mA per LED): ~240 LEDs total

---

## LED Strip Connection Guide

### Typical LED Strip Types

#### WS2812B (Most Common)

```
Strip Wire Colors:
┌──────────────────────────────┐
│ RED    → Power (+5V)         │
│ WHITE  → Data Signal         │ ← or GREEN on some strips
│ BLACK  → Ground (GND)        │
└──────────────────────────────┘

Connection to Terminal:
Strip RED   → Terminal pin 3 (+5V)
Strip WHITE → Terminal pin 2 (DATA)
Strip BLACK → Terminal pin 1 (GND)
```

**Data direction**: LEDs have input (DIN) and output (DOUT)
- Connect terminal DATA to strip DIN (input end)
- Data flows DIN → DOUT through the strip
- Multiple strips can daisy-chain: Terminal → Strip 1 DOUT → Strip 2 DIN → Strip 3 DIN...

#### APA102 / SK9822 (Clock + Data)

```
Strip Wire Colors:
┌──────────────────────────────┐
│ RED    → Power (+5V)         │
│ GREEN  → Data Signal         │
│ YELLOW → Clock Signal        │ ← Requires 2 GPIO pins!
│ BLACK  → Ground (GND)        │
└──────────────────────────────┘
```

**⚠️ Note**: APA102/SK9822 require 2 pins (DATA + CLOCK). Standard 3-pin terminal won't work without modification. Consider using 2 terminals (DATA on one, CLOCK on another) or custom wiring.

#### Single-Color LED Strips (Non-addressable)

```
Strip Wire Colors:
┌──────────────────────────────┐
│ RED   → Power (+12V or +5V)  │ ← Check voltage!
│ BLACK → Ground (GND)         │
└──────────────────────────────┘
```

**⚠️ Warning**: RGFX Driver outputs are for **addressable RGB LEDs** (WS2812B, etc.). Single-color strips or 12V strips **will not work** without additional circuitry.

### Wire Gauge Recommendations

| LED Count | Wire Gauge (AWG) | Max Length |
|-----------|------------------|------------|
| 1-10 LEDs | 24 AWG | 2 meters |
| 10-30 LEDs | 22 AWG | 2 meters |
| 30-60 LEDs | 20 AWG | 1.5 meters |
| 60+ LEDs | 18 AWG | 1 meter |

**For longer runs**: Use power injection (supply +5V and GND at both ends of strip)

---

## GPIO Pin Details

### ESP32 Pin Assignments

```
ESP32 DevKit V1 (38-pin)
        ┌─────────────────┐
    3V3 │●             ●│ GND
     EN │●             ●│ GPIO23
 GPIO36 │●             ●│ GPIO22  ← I2C SCL (OLED)
 GPIO39 │●             ●│ GPIO21  ← I2C SDA (OLED)
 GPIO34 │●             ●│ GPIO19  ← LED OUT-4
 GPIO35 │●             ●│ GPIO18  ← LED OUT-3
 GPIO32 │●             ●│ GPIO5
 GPIO33 │●             ●│ GPIO17  ← LED OUT-2
 GPIO25 │●             ●│ GPIO16  ← LED OUT-1
 GPIO26 │●             ●│ GPIO4
 GPIO27 │●             ●│ GPIO2
 GPIO14 │●             ●│ GPIO15
 GPIO12 │●             ●│ GND
 GPIO13 │●             ●│ 3V3
    GND │●             ●│ EN
    VIN │● ← 5V        ●│ GPIO0
  GPIO3 │●             ●│ GPIO1
  GPIO1 │●             ●│ GPIO3
  GPIO2 │●             ●│ GND
        └─────────────────┘
```

**Pin Capabilities:**

| GPIO | Function | Max Current | Notes |
|------|----------|-------------|-------|
| 16 | LED OUT-1 | 12mA | Safe for data signal only |
| 17 | LED OUT-2 | 12mA | Safe for data signal only |
| 18 | LED OUT-3 | 12mA | Safe for data signal only |
| 19 | LED OUT-4 | 12mA | Safe for data signal only |
| 21 | I2C SDA | 12mA | OLED display data |
| 22 | I2C SCL | 12mA | OLED display clock |

**Important**: GPIO pins provide **data signal only** (3.3V logic, ~12mA max). **DO NOT** connect LED strip power directly to GPIO pins - use terminal +5V pin!

### I2C Interface (OLED Display)

```
I2C Bus (Internal):
┌──────────────────────────────┐
│ GPIO 21 → SDA (Data)         │
│ GPIO 22 → SCL (Clock)        │
│ Speed: 400kHz (Fast Mode)    │
│ Pullup: 4.7kΩ (internal)     │
│ OLED Address: 0x3C           │
└──────────────────────────────┘
```

**OLED Display Connection:**
- VCC → 5V (or 3.3V depending on module)
- GND → Ground
- SDA → GPIO 21
- SCL → GPIO 22

---

## Voltage and Logic Levels

### Logic Levels

**ESP32 Output (GPIO pins):**
- Logic HIGH: 3.3V
- Logic LOW: 0V
- Output current: 12mA max per pin

**WS2812B LED Input:**
- Logic HIGH threshold: >0.7 × VDD (typically 3.5V for 5V operation)
- Logic LOW threshold: <0.3 × VDD (typically 1.5V for 5V operation)

**Compatibility**: ESP32 3.3V logic is **marginally compatible** with 5V WS2812B LEDs
- Works in most cases (especially with short wires <1m)
- For longer wires or reliability, add 74HCT245 level shifter (3.3V → 5V)
- **Current setup works without level shifter** for typical arcade installations

### Power Distribution

```
Power Flow:

5V 5A PSU
  │
  ├─── [Fuse 5A] ─────────────────────┐
  │                                    │
  └─── GND ────────────────────────────┼──┐
                                       │  │
       ┌───────────────────────────────┘  │
       │                                  │
       ├─── ESP32 VIN (5V)                │
       │                                  │
       ├─── OLED VCC (5V or 3.3V)         │
       │                                  │
       ├─── Terminal 1 +5V                │
       ├─── Terminal 2 +5V                │
       ├─── Terminal 3 +5V                │
       └─── Terminal 4 +5V                │
                                          │
       All grounds connected ─────────────┘
       (common ground essential!)
```

**Critical**: All grounds (ESP32, OLED, LED strips) **MUST** share common ground for proper data signal integrity!

---

## Cable Assembly Guide

### Creating LED Extension Cables

**For WS2812B LED strips:**

**Materials needed:**
- 22 AWG stranded wire (3 colors: red, white/green, black)
- JST SM connectors (optional, for removable connections)
- Heat shrink tubing
- Solder and soldering iron

**Assembly:**

1. **Cut wires to length** (add 20% extra for strain relief):
   - Red: +5V
   - White or Green: DATA
   - Black: GND

2. **Strip wire ends** (6mm for screw terminals, 3mm for solder):
   - Screw terminal end: 6mm
   - LED strip end: 3mm

3. **Tin all wire ends** with solder

4. **Terminal end** (screw connection):
   - Leave bare or add ferrule crimp
   - Insert into terminal and tighten screw

5. **LED strip end** (solder connection):
   - Solder to LED strip pads:
     - Red → +5V pad
     - White/Green → DIN pad (data input)
     - Black → GND pad
   - Add heat shrink over solder joints

6. **Optional: JST connector** (removable connection):
   - Crimp JST SM terminals onto wires
   - Insert into JST housing
   - Allows easy disconnect/reconnect

**Cable length recommendations:**
- Data signal: <2 meters (longer requires level shifter or driver)
- Power: <1 meter per strip (longer requires power injection)

---

## Common Connection Scenarios

### Scenario 1: Single 8×8 LED Matrix

```
LED Matrix (64 LEDs, WS2812B)
- Estimated current: 64 LEDs × 30mA = 1.92A

Connection:
OUT-1 Terminal          LED Matrix
┌──────┬──────┬──────┐   ┌───────┐
│ GND  │ DATA │ +5V  │───│ DIN   │
└──────┴──────┴──────┘   │ +5V   │
   │      │      └────────│ GND   │
   │      └───────────────└───────┘
   └──────────────────────────────
```

**Power budget**: 1.92A / 5A = 38% of capacity ✅ Safe

---

### Scenario 2: Four Button LED Strips

```
4× LED strips (8 LEDs each = 32 LEDs total)
- Current per strip: 8 × 30mA = 240mA
- Total current: 32 × 30mA = 960mA

Connection:
OUT-1: Player 1 Buttons (8 LEDs) → 240mA
OUT-2: Player 2 Buttons (8 LEDs) → 240mA
OUT-3: Coin Slot (8 LEDs)        → 240mA
OUT-4: Extra Effects (8 LEDs)    → 240mA

Total: 960mA / 5A = 19% of capacity ✅ Safe
```

---

### Scenario 3: Daisy-Chained Strips

```
Three strips on one output (daisy-chained):

OUT-1 Terminal          Strip 1        Strip 2        Strip 3
┌──────┬──────┬──────┐   ┌──────┐     ┌──────┐     ┌──────┐
│ GND  │ DATA │ +5V  │───│ DIN  │─────│ DIN  │─────│ DIN  │
└──────┴──────┴──────┘   │ DOUT │     │ DOUT │     │ DOUT │
   │      │      │        │ +5V  │     │ +5V  │     │ +5V  │
   │      │      │        │ GND  │     │ GND  │     │ GND  │
   │      │      └────────┴──────┴─────┴──────┴─────┴──────┘
   └───────────────────────────────────────────────────────
                          │              │              │
                Power injection recommended ────────────┘
                          (parallel +5V/GND connections)
```

**Data flow**: Terminal DATA → Strip 1 DIN → Strip 1 DOUT → Strip 2 DIN → Strip 2 DOUT → Strip 3 DIN

**Power injection**: Connect +5V and GND to each strip's power pads (parallel connection) to prevent voltage drop.

---

### Scenario 4: Mixed LED Devices

```
Different LED types on different outputs:

OUT-1: WS2812B Strip (30 LEDs) → 900mA
OUT-2: WS2812B Matrix (64 LEDs) → 1.92A
OUT-3: WS2812B Buttons (8 LEDs) → 240mA
OUT-4: Unused

Total: 3.06A / 5A = 61% of capacity ✅ Safe
```

---

## Troubleshooting Connection Issues

### Problem: LEDs Don't Light Up

**Check list:**

1. **Verify power at terminal:**
   ```
   Multimeter → DC Voltage mode
   Measure: +5V pin to GND pin
   Expected: 4.9-5.1V DC
   ```

2. **Check LED strip polarity:**
   ```
   Verify correct connections:
   Strip RED → Terminal +5V (pin 3)
   Strip DATA → Terminal DATA (pin 2)
   Strip BLACK → Terminal GND (pin 1)
   ```

3. **Test with different output:**
   - Move LED strip to OUT-1 (GPIO 16)
   - OUT-1 is default in firmware
   - If works on OUT-1, issue is GPIO configuration

4. **Verify firmware GPIO settings:**
   ```cpp
   // Check esp32/src/config_leds.cpp
   FastLED.addLeds<WS2812B, 16, GRB>(leds, NUM_LEDS); // GPIO 16
   ```

---

### Problem: First Few LEDs Work, Rest Don't

**Likely cause**: Data signal degradation or power voltage drop

**Solutions:**

1. **Shorten cable length:**
   - Keep data wire <1 meter
   - Use thicker wire (20-22 AWG)

2. **Add level shifter** (3.3V → 5V):
   ```
   ESP32 GPIO → 74HCT245 → LED DATA
   Boosts 3.3V logic to 5V for better reliability
   ```

3. **Power injection** (for voltage drop):
   ```
   Add +5V and GND to far end of LED strip
   Prevents voltage sag on long strips
   ```

---

### Problem: LEDs Flicker or Wrong Colors

**Likely cause**: Voltage drop, insufficient power, or EMI

**Solutions:**

1. **Reduce brightness:**
   ```cpp
   FastLED.setBrightness(64); // Lower from 255
   ```

2. **Add capacitor to LED strip:**
   ```
   Solder 100µF-1000µF cap across +5V and GND
   at LED strip input (near DIN)
   ```

3. **Improve grounding:**
   ```
   Ensure solid GND connection
   Use twisted pair or shielded cable for DATA
   ```

4. **Check power supply capacity:**
   ```
   Measure current draw → should be <5A
   If near 5A, reduce LED count or brightness
   ```

---

## Advanced: Firmware GPIO Configuration

### Changing GPIO Pin Assignments

**File**: `esp32/src/config_leds.cpp`

```cpp
// Default configuration uses GPIO 16
FastLED.addLeds<WS2812B, 16, GRB>(matrix.leds, matrix.size);
                       ↑
                  Change this number to use different GPIO
```

**Available GPIO pins:**
- GPIO 16, 17, 18, 19 (pre-wired in enclosure)
- GPIO 23, 25, 26, 27 (available, not wired)

**To use OUT-2 (GPIO 17) instead:**
```cpp
FastLED.addLeds<WS2812B, 17, GRB>(matrix.leds, matrix.size);
```

**Note**: Firmware currently supports single LED output only. Multi-output requires code changes.

---

## Safety and Warnings

### Electrical Safety

⚠️ **Always disconnect power before making changes!**

**DO:**
- ✅ Verify polarity before connecting
- ✅ Use properly rated wire (18 AWG for power)
- ✅ Check voltage with multimeter
- ✅ Ensure common ground for all devices
- ✅ Stay within 5A total current budget

**DON'T:**
- ❌ Connect 12V LED strips (will damage system)
- ❌ Exceed 5A total current
- ❌ Use wrong polarity power supply
- ❌ Connect power directly to GPIO pins
- ❌ Short +5V to GND

### Fire Safety

**Overload prevention:**
- 5A fuse provides protection
- Monitor temperature during extended use
- Use proper wire gauge (18 AWG minimum for power)
- Ensure adequate ventilation

**If fuse blows repeatedly**: SHORT CIRCUIT! Disconnect and troubleshoot immediately.

---

## Quick Troubleshooting Matrix

| Symptom | Likely Cause | Check This |
|---------|--------------|------------|
| No power to terminals | Blown fuse | Replace fuse, find short |
| ESP32 won't boot | No VIN voltage | Check barrel jack, fuse |
| OLED blank | Wrong voltage or I2C issue | Verify VCC, check I2C wiring |
| LEDs don't light | Wrong polarity or bad DATA | Verify connections, test continuity |
| LEDs flicker | Voltage drop or EMI | Add capacitor, shorten wires |
| Wrong colors | Color order setting | Change GRB to RGB in firmware |
| Only first LEDs work | Data signal weak | Add level shifter, shorten cable |
| Fuse blows immediately | Short circuit | Check for shorts, verify polarity |

---

## Reference Documents

- **Wiring Diagram**: [wiring-diagram.md](wiring-diagram.md) - Complete internal wiring
- **BOM**: [bom.md](bom.md) - Parts list and sources
- **Assembly Guide**: [assembly-guide.md](assembly-guide.md) - Build instructions

---

## Support and Updates

For questions or issues:
- Check RGFX project documentation: `/docs`
- Review ESP32 firmware code: `/esp32/src`
- Consult WS2812B datasheet for LED specifications

**Happy connecting!** 🎮💡✨
