# RGFX Driver Enclosure Documentation

Complete hardware documentation for building a professional RGFX Driver enclosure with external power supply supporting 64+ LEDs.

---

## Overview

This documentation provides everything you need to build a complete, professional RGFX Driver enclosure:

- **External 5V 5A power supply** support
- **4 LED outputs** with screw terminals (GPIO 16, 17, 18, 19)
- **Optional OLED display** for status monitoring
- **Removable ESP32** for easy servicing
- **Fused power protection**
- **Clean, labeled outputs**

**Target use case**: Arcade cabinets, game rooms, or any installation requiring 64+ addressable RGB LEDs across multiple devices.

---

## What You'll Build

```
RGFX Driver Enclosure (Completed Build):

Front View:
┌─────────────────────────────────────────┐
│  ╔═══════════════════════════════════╗  │
│  ║                                   ║  │
│  ║     RGFX Driver Status Display    ║  │ ← OLED Display
│  ║     WiFi: Connected               ║  │
│  ║     MQTT: Connected               ║  │
│  ║     Uptime: 01:23:45              ║  │
│  ║                                   ║  │
│  ╚═══════════════════════════════════╝  │
└─────────────────────────────────────────┘

Back View:
┌─────────────────────────────────────────┐
│  Power Input:                           │
│  ◯ 5V 5A Barrel Jack                    │
│  ◯ USB-C (Programming - Optional)       │
│                                         │
│  LED Outputs:                           │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │OUT-1│ │OUT-2│ │OUT-3│ │OUT-4│       │
│  │ ● ● ●│ │ ● ● ●│ │ ● ● ●│ │ ● ● ●│       │
│  │GND│D│5│ │GND│D│5│ │GND│D│5│ │GND│D│5│       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────┘
```

---

## Quick Start Guide

### 1. Review Documentation

Start here to understand the complete project:

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[BOM (Bill of Materials)](bom.md)** | Component shopping list | **Read First** - Before ordering parts |
| **[Wiring Diagram](wiring-diagram.md)** | Complete internal wiring | Before assembly, for reference during build |
| **[Assembly Guide](assembly-guide.md)** | Step-by-step build instructions | During assembly |
| **[Pinout Reference](pinout-reference.md)** | Connector pinouts & LED connections | When connecting LED strips |

### 2. Order Components

See **[bom.md](bom.md)** for complete parts list with links.

**Estimated cost**: $70-75 per unit (including ESP32 and OLED)

**Quick shopping strategy:**
- **Amazon**: Enclosure, power supply, wire, terminals (~$60)
- **Digi-Key** (optional): Professional-grade connectors (~$15)
- **Lead time**: 1-3 days with Prime, 2-4 weeks with AliExpress

### 3. Build Enclosure

Follow **[assembly-guide.md](assembly-guide.md)** step-by-step:

**Time required**:
- First build: 3-4 hours
- Subsequent builds: 2 hours

**Difficulty**: Intermediate (basic soldering required)

### 4. Connect LED Strips

Use **[pinout-reference.md](pinout-reference.md)** for:
- Terminal pin layouts
- Wire color codes
- Connection examples
- Troubleshooting

---

## Features

### Power System

✅ **External 5V 5A Power Supply**
- Supports 64+ LEDs total across all outputs
- Fused for safety (5A blade fuse)
- Barrel jack input (center positive)
- Separate USB-C for programming (optional)

✅ **Power Distribution**
- 1000µF capacitor for voltage smoothing
- Shared 5A budget across 4 outputs
- Individual GND and +5V for each terminal

### LED Outputs

✅ **4 Screw Terminal Outputs**
- GPIO 16, 17, 18, 19 (configurable in firmware)
- 3-pin terminals: [GND] [DATA] [+5V]
- Color-coded internal wiring (Yellow/Orange/Green/Blue)
- Field-serviceable (easy to swap LED strips)

✅ **LED Support**
- WS2812B, WS2811, SK6812 (most common)
- APA102, SK9822 (with modification)
- Up to 80 LEDs @ full brightness
- Up to 160 LEDs @ medium brightness (typical gaming use)

### Display & Monitoring

✅ **Optional OLED Status Display**
- 128×64 I2C SSD1306 display
- Real-time status: WiFi, MQTT, uptime
- Mounted in top panel window
- Runs on separate CPU core (no LED performance impact)

### Serviceability

✅ **Easy Maintenance**
- Removable ESP32 (plugs into headers)
- Accessible screw terminals
- Perfboard can be removed without desoldering
- Labeled outputs for quick identification

---

## Specifications

### Electrical Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| Input Voltage | 5V DC ±5% | Center positive barrel jack |
| Input Current | 5A maximum | Fuse protected |
| Output Voltage | 5V DC | To LED strips |
| Output Current | 5A total (shared) | Across all 4 outputs |
| GPIO Logic Level | 3.3V | ESP32 output |
| LED Data Signal | 3.3V logic | Works with 5V WS2812B |
| Fuse Rating | 5A ATO/ATC blade | Automotive style |

### Physical Specifications

| Parameter | Value | Notes |
|-----------|-------|-------|
| Enclosure Size | 120×94×55mm | Hammond 1554 or equivalent |
| Perfboard Size | 100×160mm | FR4, 2.54mm pitch |
| Mounting | 4× M3 brass standoffs | 8-10mm height |
| Weight | ~200g | Fully assembled |
| Ventilation | Optional 4-6× 5mm holes | Passive airflow |

### GPIO Assignments

| GPIO | Function | Terminal | Wire Color |
|------|----------|----------|------------|
| 16 | LED Data 1 | OUT-1 | Yellow |
| 17 | LED Data 2 | OUT-2 | Orange |
| 18 | LED Data 3 | OUT-3 | Green |
| 19 | LED Data 4 | OUT-4 | Blue |
| 21 | I2C SDA | OLED Display | White |
| 22 | I2C SCL | OLED Display | Gray |

---

## LED Power Budget

### Current Draw Calculations

**WS2812B LED current draw (per LED):**
- Full white (max brightness): ~60mA
- Typical colors (medium brightness): ~20-40mA
- Off (black): ~1mA

**Safe LED counts** (total across all outputs):

| Brightness | Current/LED | Max LEDs | Total Current |
|------------|-------------|----------|---------------|
| Full (255) | 60mA | ~80 LEDs | 4.8A |
| Medium (128) | 30mA | ~160 LEDs | 4.8A |
| Low (64) | 20mA | ~240 LEDs | 4.8A |

**Example configurations:**

| Configuration | Current | Safe? |
|---------------|---------|-------|
| 4× 8-LED strips (32 total) @ medium | 960mA | ✅ YES |
| 4× 16-LED strips (64 total) @ medium | 1.92A | ✅ YES |
| 2× 8×8 matrices (128 total) @ medium | 3.84A | ✅ YES |
| 1× 8×8 matrix + 3× 16-LED strips @ bright | 4.32A | ⚠️ Marginal |
| 4× 8×8 matrices (256 total) @ any brightness | >5A | ❌ NO |

**Pro tip**: Firmware default brightness is 64 (25%), which keeps typical current around 2-3A for 64+ LEDs - safe headroom.

---

## Build Phases Overview

The assembly guide is organized into 6 phases:

### Phase 1: Enclosure Preparation (30-45 min)
- Drill holes for barrel jack, terminals, display window
- Deburr and clean enclosure
- Test fit components

### Phase 2: Perfboard Assembly (90-120 min)
- Solder power buses (5V+, GND)
- Install fuse and capacitor
- Install ESP32 headers
- Wire GPIO pins to terminal locations

### Phase 3: Panel Mount Components (30-45 min)
- Install barrel jack
- Mount screw terminals
- Optional: Install USB-C connector

### Phase 4: Final Assembly (30-45 min)
- Mount perfboard to enclosure
- Connect all wiring
- Install ESP32 and OLED

### Phase 5: Testing and Power-Up (30 min)
- Continuity testing
- Initial power-up (no ESP32)
- Full power-up with LEDs

### Phase 6: Final Touches (15 min)
- Cable management
- Labeling
- Close enclosure

**Total time**: 3-4 hours (first build), 2 hours (subsequent builds)

---

## Tools Required

### Essential Tools

- [ ] Soldering iron (40W minimum, temperature controlled preferred)
- [ ] Solder (60/40 or lead-free, 0.8mm diameter)
- [ ] Wire strippers (18-24 AWG)
- [ ] Flush cutters
- [ ] Multimeter (essential for testing!)
- [ ] Drill with bits (5mm, 8mm, 11mm, 32mm or step bit)
- [ ] Screwdrivers (Phillips #1, small flathead)
- [ ] Heat gun or lighter (for heat shrink)

### Optional but Helpful

- [ ] Helping hands or PCB holder
- [ ] Step drill bit (easier for large holes)
- [ ] Label maker
- [ ] Rotary tool (Dremel) for display cutout
- [ ] ESD mat and wrist strap
- [ ] Fume extractor for soldering

**Total tool cost** (if starting from scratch): ~$130-180

Many makerspaces and libraries have tool lending programs!

---

## Safety Guidelines

### Electrical Safety

⚠️ **Always disconnect power before making changes!**

**Critical safety points:**
- ✅ Use 5A fuse (mandatory - protects against shorts)
- ✅ Verify capacitor polarity (stripe = negative)
- ✅ Check voltage with multimeter before connecting ESP32
- ✅ Ensure common ground for all devices
- ✅ Use proper wire gauge (18 AWG for power buses)

**Dangerous situations:**
- ❌ Short circuit between +5V and GND → Fire hazard
- ❌ Wrong power supply polarity → Destroys ESP32/LEDs
- ❌ Capacitor reversed → Explosion hazard
- ❌ Exceeding 5A current → Overheating/fire hazard

### Fire Safety

**If fuse blows repeatedly**: SHORT CIRCUIT!
1. Disconnect power immediately
2. Check for loose wire strands between +5V and GND
3. Inspect all solder joints for bridges
4. Verify LED strip polarity
5. Measure resistance between +5V and GND (should be >10kΩ)

**During operation:**
- Monitor temperature (components should stay cool)
- Ensure adequate ventilation
- Stay within 5A current budget
- Use in dry, indoor locations only

---

## Troubleshooting Quick Reference

| Symptom | Check This First | See Document |
|---------|------------------|--------------|
| No power | Fuse blown? Barrel jack polarity? | [Assembly Guide - Phase 5](assembly-guide.md#phase-5-testing-and-power-up) |
| ESP32 won't boot | VIN voltage 5V? GND connected? | [Pinout Reference - Troubleshooting](pinout-reference.md#troubleshooting-connection-issues) |
| OLED blank | VCC voltage? I2C wiring? | [Wiring Diagram - OLED](wiring-diagram.md#step-27-install-female-header-for-oled) |
| LEDs don't light | Terminal +5V voltage? GPIO wiring? | [Pinout Reference - Troubleshooting](pinout-reference.md#problem-leds-dont-light-up) |
| LEDs flicker | Voltage drop? Add capacitor? | [Pinout Reference - Troubleshooting](pinout-reference.md#problem-leds-flicker-or-wrong-colors) |
| Fuse blows | SHORT CIRCUIT! Find and fix! | [Assembly Guide - Troubleshooting](assembly-guide.md#problem-fuse-keeps-blowing) |

---

## FAQ

### Q: Can I use a different enclosure?

**A:** Yes! Any plastic or metal enclosure 100-150mm length with 50mm+ height will work. Just adjust hole positions accordingly.

### Q: Can I use USB-C for power instead of barrel jack?

**A:** USB-C can provide up to 3A (15W), which works for ~40-50 LEDs only. For 64+ LEDs, you need a dedicated 5V 5A supply with barrel jack.

### Q: Do I need the OLED display?

**A:** No, it's optional. The Driver works perfectly without it. OLED is convenient for seeing WiFi/MQTT status without opening the Hub UI.

### Q: Can I add more than 4 outputs?

**A:** Yes! ESP32 has additional free GPIOs (23, 25, 26, 27). You'd need to:
1. Add more screw terminals to the enclosure
2. Wire additional GPIOs to terminals
3. Modify firmware to support multiple outputs (currently single output only)

### Q: What's the maximum LED count?

**A:** Limited by 5A power supply:
- Conservative: 80 LEDs @ full brightness
- Typical: 160 LEDs @ medium brightness (gaming use)
- Maximum: 240 LEDs @ low brightness

For more LEDs, use multiple Driver units or higher-capacity power supply (10A).

### Q: Can I use 12V LED strips?

**A:** No! This enclosure is designed for 5V addressable LEDs (WS2812B, etc.). 12V strips require different power supply and would damage the 5V circuitry.

### Q: Do I need a level shifter for 3.3V → 5V?

**A:** Usually no. ESP32's 3.3V logic works with most 5V WS2812B strips, especially for short wires (<1m). For longer wires or reliability, add 74HCT245 level shifter.

### Q: Can I use this outdoors?

**A:** The Hammond 1554 enclosure is UV-resistant but not waterproof. For outdoor use, you'd need:
- IP65-rated weatherproof enclosure
- Sealed cable glands for wire entry
- Conformal coating on PCB
- Adequate ventilation (moisture/condensation)

### Q: How do I update the firmware?

**A:** Three ways:
1. **USB-C panel connector** (if installed) - Connect to computer
2. **ESP32's built-in USB** - Open enclosure, plug USB cable
3. **Over-The-Air (OTA)** - Upload via network (WiFi required)

See firmware documentation for OTA update instructions.

---

## Component Substitutions

### What can I substitute?

**Enclosure:**
- ✅ Any 100-150mm plastic/aluminum enclosure works
- ✅ 3D-printed custom enclosure (STL files not provided, design your own)

**Power Supply:**
- ✅ 5V 3A supply works for ≤40 LEDs
- ✅ 5V 10A supply future-proofs for 100+ LEDs
- ❌ 12V supply will damage everything!

**Screw Terminals:**
- ✅ JST SM connectors (more compact, requires pre-made cables)
- ✅ Spring terminals (easier to use, slightly bulkier)
- ✅ Solder pads directly (cheapest, not field-serviceable)

**ESP32:**
- ✅ ESP32 DevKit V1 (38-pin) - recommended
- ✅ ESP32-WROOM-32 variants - compatible
- ✅ ESP32-S3 - compatible (more powerful)
- ❌ ESP8266 - different pinout, less capable
- ⚠️ ESP32-C3 - different GPIO layout, check compatibility

**OLED:**
- ✅ 128×64 I2C SSD1306 - recommended
- ✅ 128×32 I2C SSD1306 - less info displayed
- ❌ SPI displays - different wiring, requires firmware changes

**Perfboard:**
- ✅ Protoboard with pads - easier soldering
- ✅ Stripboard with traces - faster assembly
- ✅ Custom PCB - most professional (requires design)

---

## Next Steps After Building

Once your enclosure is complete:

1. **Flash firmware** - Upload RGFX Driver firmware to ESP32
2. **Configure WiFi** - Connect to driver's AP and enter network credentials
3. **Register with Hub** - Driver automatically discovers Hub via mDNS
4. **Configure LED devices** - Set up LED hardware in Hub UI
5. **Connect LED strips** - Wire your physical LEDs to screw terminals
6. **Test with game** - Launch MAME and watch LEDs react!

**Firmware source**: `/esp32/` directory in RGFX project
**Hub UI**: See `/rgfx-hub/` for Hub application

---

## Support and Resources

### Project Documentation

- **Main README**: `/README.md` - Project overview
- **Architecture**: `/docs/architecture.md` - System design
- **ESP32 Firmware**: `/esp32/` - Driver firmware source
- **Hub Application**: `/rgfx-hub/` - Main controller app

### External Resources

- **ESP32 Datasheet**: [Espressif ESP32 Technical Reference](https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf)
- **WS2812B Datasheet**: [Worldsemi WS2812B Specification](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)
- **FastLED Library**: [FastLED Documentation](http://fastled.io/)
- **Hammond Enclosures**: [Hammond 1554 Series](https://www.hammfg.com/electronics/small-case/plastic/1554)

### Community and Help

For questions or issues:
- Check troubleshooting sections in this documentation
- Review firmware source code for GPIO configurations
- Consult component datasheets for specifications

---

## Version History

**v1.0** (2025-10-29)
- Initial documentation release
- Covers single 5V 5A power supply design
- 4 LED outputs (GPIO 16, 17, 18, 19)
- Optional OLED display
- Hammond 1554 enclosure reference design

---

## Credits

Documentation created for the RGFX (Retro Game Effects) project.

**License**: Mozilla Public License 2.0 (same as RGFX project)

---

## Document Index

| Document | Purpose | Essential? |
|----------|---------|-----------|
| [README.md](README.md) (this file) | Overview and quick start | Start here |
| [bom.md](bom.md) | Parts list with prices and links | ✅ Yes - Order parts |
| [wiring-diagram.md](wiring-diagram.md) | Complete internal wiring diagrams | ✅ Yes - Reference during build |
| [assembly-guide.md](assembly-guide.md) | Step-by-step build instructions | ✅ Yes - Follow during assembly |
| [pinout-reference.md](pinout-reference.md) | Terminal pinouts and LED connections | ✅ Yes - When connecting LEDs |

**Recommended reading order**:
1. README.md (this document) - Overview
2. bom.md - Order components
3. wiring-diagram.md - Understand wiring
4. assembly-guide.md - Build enclosure
5. pinout-reference.md - Connect LED strips

---

**Ready to build?** Start with the **[Bill of Materials (bom.md)](bom.md)** to order components!

**Good luck with your build!** 🎮💡✨
