# RGFX Driver Enclosure - Bill of Materials (BOM)

Complete parts list with specific product recommendations and pricing for building 1-3 RGFX Driver enclosures.

**Last Updated**: 2025-10-29
**Target**: 64+ LED installation with external 5V power supply

---

## Quick Summary

| Category | Cost (1 unit) | Cost (3 units) |
|----------|---------------|----------------|
| Enclosure | $15 | $45 |
| Power Supply & Distribution | $18 | $54 |
| Connectors & Terminals | $8 | $24 |
| Electronics Components | $5 | $12 |
| ESP32 & OLED (if needed) | $15 | $45 |
| Hardware & Mounting | $4 | $10 |
| Wire & Cable | $8 | $12 (bulk) |
| **TOTAL** | **$73** | **$202** |

**Per-unit cost at 3 units**: ~$67 (bulk wire savings)

---

## Detailed Component List

### 1. Enclosure

| Item | Qty | Unit Price | Total | Supplier | Part Number | Notes |
|------|-----|------------|-------|----------|-------------|-------|
| Hammond 1554 Plastic Enclosure (120×94×55mm) | 1 | $15.00 | $15.00 | Digi-Key / Mouser | 1554FGY (gray) / 1554FBK (black) | UV-resistant polycarbonate |

**Alternative Options:**
- **Budget**: Generic plastic project box 150×100×60mm - $6-8 (Amazon: "plastic project box electronics")
- **Premium**: Takachi LS Series aluminum enclosure 120×90×40mm - $22-28 (Digi-Key)

**Amazon Search**: "Hammond 1554 enclosure" or "plastic electronics enclosure 120mm"

---

### 2. Power Supply & Distribution

| Item | Qty | Unit Price | Total | Supplier | Part Number | Notes |
|------|-----|------------|-------|----------|-------------|-------|
| 5V 5A Power Supply (25W, barrel jack) | 1 | $13.00 | $13.00 | Amazon | ALITOVE 5V 5A 25W | AC 100-240V input, center positive |
| Barrel Jack Panel Mount (5.5×2.1mm) | 1 | $1.00 | $1.00 | Amazon / Digi-Key | CP-202A | Center positive, threaded nut mount |
| 5A Blade Fuse | 2 | $0.50 | $1.00 | Amazon / Auto store | ATO/ATC 5A | Automotive style, pack of 10-25 |
| Inline Blade Fuse Holder | 1 | $1.50 | $1.50 | Amazon / Auto store | 16AWG inline | Panel mount or inline style |
| 1000µF 16V Electrolytic Capacitor | 1 | $0.50 | $0.50 | Amazon / Digi-Key | Radial lead | Low ESR preferred |
| USB-C Panel Mount (optional) | 1 | $2.00 | $2.00 | Amazon | USB-C female panel mount | For programming only |

**Subtotal**: $19.00

**Power Supply Alternatives:**
- **5V 3A** (15W) - $10 - Adequate for 40-50 LEDs only
- **5V 10A** (50W) - $22 - Future-proof for 100+ LEDs

**Amazon Links** (search terms):
- "ALITOVE 5V 5A power supply barrel jack"
- "5.5mm barrel jack panel mount"
- "5 amp blade fuse ATO"
- "inline fuse holder 16awg"
- "1000uf 16v capacitor radial"

---

### 3. Connectors & Terminals

| Item | Qty | Unit Price | Total | Supplier | Part Number | Notes |
|------|-----|------------|-------|----------|-------------|-------|
| 3-Pin Screw Terminal Block (5.08mm pitch) | 4 | $0.75 | $3.00 | Amazon / Digi-Key | Phoenix Contact style | Panel mount, 10A rated |
| 4-Pin JST SM Connector Set (optional) | 1 | $0.50 | $0.50 | Amazon / Digi-Key | JST SM 2.54mm | For removable OLED |
| 40-Pin Female Header Strip (2.54mm) | 1 | $1.50 | $1.50 | Amazon / Digi-Key | 2×20 breakable | For mounting ESP32 |
| 40-Pin Male Header Strip (optional) | 1 | $1.00 | $1.00 | Amazon / Digi-Key | 2×20 breakable | If ESP32 doesn't have headers |

**Subtotal**: $6.00

**Screw Terminal Alternatives:**
- **3.5mm pitch** - $0.50 each - More compact, lower current rating (good for smaller LEDs)
- **JST connectors** instead of screw terminals - $0.30 each - Cleaner look, not field-serviceable

**Amazon Search**: "screw terminal block 5.08mm 3 pin" or "phoenix contact terminal block"

---

### 4. Electronics Components

| Item | Qty | Unit Price | Total | Supplier | Part Number | Notes |
|------|-----|------------|-------|----------|-------------|-------|
| 4.7kΩ Resistor (1/4W) | 2 | $0.05 | $0.10 | Amazon / Digi-Key | Carbon film | I2C pullups (SDA, SCL) |
| 100nF Ceramic Capacitor | 4 | $0.10 | $0.40 | Amazon / Digi-Key | 50V | Data line decoupling |
| Perfboard (100×160mm, 2.54mm pitch) | 1 | $3.00 | $3.00 | Amazon | FR4 universal PCB | Single-sided or double-sided |

**Subtotal**: $3.50

**Note**: Resistors and capacitors often come in packs of 100+, so actual cost is lower if you already have components.

**Amazon Search**: "perfboard 100x160mm" or "prototype pcb board universal"

---

### 5. ESP32 & Display (if not already owned)

| Item | Qty | Unit Price | Total | Supplier | Part Number | Notes |
|------|-----|------------|-------|----------|-------------|-------|
| ESP32 DevKit V1 (38-pin) | 1 | $8.00 | $8.00 | Amazon / AliExpress | ESP32-WROOM-32 | Pre-soldered headers preferred |
| 128×64 OLED Display (I2C, SSD1306) | 1 | $6.00 | $6.00 | Amazon / AliExpress | 0.96" I2C module | 4-pin (VCC/GND/SDA/SCL) |

**Subtotal**: $14.00

**Note**: Skip if you already have these components!

**Amazon Search**:
- "ESP32 development board devkit"
- "0.96 inch OLED I2C SSD1306"

---

### 6. Hardware & Mounting

| Item | Qty | Unit Price | Total | Supplier | Part Number | Notes |
|------|-----|------------|-------|----------|-------------|-------|
| M3 Brass Standoffs (8-10mm, F-F) | 4 | $0.40 | $1.60 | Amazon / Digi-Key | M3×8mm or M3×10mm | Female-female threaded |
| M3 Pan Head Screws (6mm) | 8 | $0.10 | $0.80 | Amazon / Digi-Key | M3×6mm | Phillips or hex |
| M2 Screws (6mm, for OLED - optional) | 4 | $0.10 | $0.40 | Amazon / Digi-Key | M2×6mm | If OLED has mounting holes |
| Foam Double-Sided Tape | 1 strip | $0.50 | $0.50 | Amazon / Hardware store | 3M VHB or similar | For OLED mounting |
| Cable Clips (3mm adhesive-backed) | 10 | $0.05 | $0.50 | Amazon | Self-adhesive nylon | Cable management |

**Subtotal**: $3.80

**Amazon Search**:
- "M3 brass standoff kit"
- "M3 screw assortment kit"
- "foam mounting tape double sided"

---

### 7. Wire & Cable

| Item | Qty | Unit Price | Total | Supplier | Part Number | Notes |
|------|-----|------------|-------|----------|-------------|-------|
| 18 AWG Stranded Wire (red) | 2m | $1.50 | $1.50 | Amazon / Hardware store | Silicone insulation | Power (+5V) |
| 18 AWG Stranded Wire (black) | 2m | $1.50 | $1.50 | Amazon / Hardware store | Silicone insulation | Ground (GND) |
| 22 AWG Stranded Wire (assorted) | 3m | $2.50 | $2.50 | Amazon | Red/black/yellow/green | Signal wires (GPIO) |
| Heat Shrink Tubing Assortment | 1 kit | $5.00 | $5.00 | Amazon | Various sizes | Insulation & strain relief |

**Subtotal**: $10.50

**Bulk Option (for 3+ units)**:
- 18 AWG wire spool (25ft each color) - $12 total (saves $6 over 3 units)
- 22 AWG wire kit (6 colors, 20ft each) - $15 (saves $10 over 3 units)

**Amazon Search**:
- "18 awg silicone wire red black"
- "22 awg hookup wire kit stranded"
- "heat shrink tubing assortment"

---

## Tools Required

You'll need these tools for assembly (one-time purchase if you don't own):

| Tool | Estimated Cost | Notes |
|------|---------------|-------|
| Soldering Iron (40W minimum) | $15-25 | Temperature controlled preferred |
| Solder (60/40 or lead-free) | $8 | 0.8mm diameter |
| Wire Strippers | $10-15 | For 18-24 AWG |
| Flush Cutters | $8 | For trimming wire/leads |
| Multimeter | $15-25 | Essential for testing |
| Drill & Bits | $30-50 | For enclosure holes (5mm, 8mm, 11mm, 32mm) |
| Step Drill Bit (optional) | $15 | Easier for large holes |
| Screwdrivers (Phillips, small flathead) | $10 | For terminals & screws |
| Heat Gun or Lighter | $15 / $2 | For heat shrink tubing |
| Helping Hands / PCB Holder | $10 | Makes soldering easier |

**Total Tool Cost** (if starting from scratch): ~$130-180

**Budget Tip**: Many makerspaces and libraries have tool lending programs!

---

## Complete BOM with Links

### Recommended Amazon Shopping List (1 Unit)

Copy this list for quick shopping:

```
Search Terms (Amazon):
1. "Hammond 1554FGY enclosure" OR "plastic electronics project box 120mm"
2. "ALITOVE 5V 5A power supply barrel jack"
3. "5.5mm barrel jack panel mount female"
4. "5 amp blade fuse ATO automotive"
5. "inline fuse holder 16 awg"
6. "1000uf 16v electrolytic capacitor"
7. "usb c panel mount female" (optional)
8. "screw terminal block 5.08mm 3 pin" (buy 4)
9. "JST SM connector 4 pin 2.54mm" (optional)
10. "female header pins 40 pin 2.54mm"
11. "perfboard 100x160mm pcb"
12. "resistor kit 1/4w assorted" (includes 4.7kΩ)
13. "ceramic capacitor kit 50v" (includes 100nF)
14. "ESP32 development board wroom 32" (if needed)
15. "0.96 inch OLED display I2C SSD1306" (if needed)
16. "M3 brass standoff kit" (includes screws)
17. "foam mounting tape double sided 3M"
18. "cable clips adhesive 3mm"
19. "18 awg silicone wire red black kit"
20. "22 awg hookup wire stranded kit"
21. "heat shrink tubing assortment kit"
```

**Estimated total**: $70-80 depending on options chosen

---

### Recommended Digi-Key/Mouser Shopping List

For professional-grade components:

| Digi-Key Part # | Description | Qty | Price |
|----------------|-------------|-----|-------|
| HM1554FGY-ND | Hammond 1554FGY Enclosure | 1 | $15.43 |
| CP-202A-ND | CUI Barrel Jack Panel Mount | 1 | $0.97 |
| 399-6596-ND | Keystone Fuse Holder | 1 | $1.52 |
| P5555-ND | Panasonic 1000µF 16V Cap | 1 | $0.68 |
| ED2609-ND | Phoenix Terminal Block 3-pos (pack of 4) | 1 | $4.20 |
| S7036-ND | Sullins Female Header 40-pos | 1 | $1.83 |
| 1528-2039-ND | Generic Perfboard 100×160mm | 1 | $3.45 |

Power supply from Amazon (better value than Digi-Key).

---

## Cost Breakdown by Quantity

### Building 1 Unit

| Category | Cost |
|----------|------|
| Enclosure | $15.00 |
| Power Supply & Distribution | $19.00 |
| Connectors & Terminals | $6.00 |
| Electronics Components | $3.50 |
| ESP32 & OLED (if needed) | $14.00 |
| Hardware & Mounting | $3.80 |
| Wire & Cable | $10.50 |
| **TOTAL (with ESP32/OLED)** | **$71.80** |
| **TOTAL (without ESP32/OLED)** | **$57.80** |

### Building 3 Units

| Category | Unit Cost × 3 | Bulk Savings | Total |
|----------|---------------|--------------|-------|
| Enclosure | $45.00 | — | $45.00 |
| Power Supply & Distribution | $57.00 | — | $57.00 |
| Connectors & Terminals | $18.00 | — | $18.00 |
| Electronics Components | $10.50 | — | $10.50 |
| ESP32 & OLED (if needed) | $42.00 | — | $42.00 |
| Hardware & Mounting | $11.40 | -$1.40 | $10.00 |
| Wire & Cable | $31.50 | -$19.50 | $12.00 |
| **TOTAL (with ESP32/OLED)** | $215.40 | -$20.90 | **$194.50** |
| **TOTAL (without ESP32/OLED)** | | | **$152.50** |

**Per-unit cost at 3 units**: $64.83 (with ESP32/OLED) or $50.83 (without)

---

## Budget vs Premium Options

### Budget Build (~$45 per unit)

- Generic plastic enclosure: $6
- 5V 3A power supply: $10
- Basic screw terminals: $2
- Generic perfboard: $2
- No OLED display (not essential)
- Basic wire from hardware store: $8
- **Total**: ~$45

**Trade-offs**:
- Less professional appearance
- Limited to 40-50 LEDs (3A supply)
- No status display
- Still fully functional!

### Premium Build (~$95 per unit)

- Takachi aluminum enclosure: $25
- 5V 10A power supply: $22
- Phoenix Contact terminals: $8
- High-quality FR4 perfboard: $5
- OLED with custom mount: $8
- Silicone wire + braided sleeving: $15
- Custom laser-engraved labels: $12
- **Total**: ~$95

**Benefits**:
- Professional appearance
- Supports 100+ LEDs
- Premium build quality
- Easier expansion

---

## Where to Buy

### Online Retailers

**Amazon** (Best for speed & convenience)
- Pros: Fast shipping (1-2 days with Prime), easy returns
- Cons: Higher prices than bulk
- Best for: Complete kits, enclosures, wire

**Digi-Key / Mouser** (Best for quality & selection)
- Pros: Authentic parts, excellent datasheets, precise specs
- Cons: Shipping costs on small orders
- Best for: Connectors, terminals, capacitors, precision components

**AliExpress / eBay** (Best for budget)
- Pros: Very low prices (50-70% off Amazon)
- Cons: Slow shipping (2-4 weeks), variable quality
- Best for: ESP32 boards, OLED displays, bulk wire

**Local Electronics Store** (Best for immediate needs)
- Pros: Instant availability, advice from staff
- Cons: Limited selection, higher prices
- Best for: Emergency replacements, small component packs

### Bulk Component Suppliers (for >10 units)

- **Jameco Electronics**: jameco.com
- **Newark / Element14**: newark.com
- **Arrow Electronics**: arrow.com

Request quotes for quantity discounts.

---

## Alternative Component Substitutions

### Can I use different...

**Enclosure?**
✅ YES - Any plastic/metal enclosure 100-150mm length works
- Ensure at least 50mm height for component clearance
- Need space for barrel jack (~12mm diameter hole)

**Power Supply?**
⚠️ MAYBE
- ✅ 5V 3A: OK for ≤50 LEDs
- ✅ 5V 5A: Recommended for 60-80 LEDs
- ✅ 5V 10A: Best for 80-150 LEDs
- ❌ 12V supply: NO - Will destroy ESP32 and LEDs
- ❌ 3.3V supply: NO - LEDs need 5V

**Screw Terminals?**
✅ YES
- JST SM connectors: More compact, requires pre-made cables
- Spring terminals: Easier to use, slightly bulkier
- Solder pads: Cheapest, not field-serviceable

**Perfboard?**
✅ YES
- Protoboard (with copper pads): Easier soldering
- Stripboard (with copper traces): Faster assembly
- Custom PCB: Most professional (requires design)

**ESP32 Board?**
⚠️ MAYBE
- ✅ ESP32 DevKit V1 (38-pin): Recommended, widely available
- ✅ ESP32-WROOM-32 variants: Compatible
- ✅ ESP32-S3 boards: Compatible (more powerful)
- ❌ ESP8266: NO - Different pinout, less capable
- ❌ ESP32-C3: MAYBE - Different GPIO layout, check compatibility

**OLED Display?**
✅ YES
- ✅ 128×64 I2C SSD1306: Recommended
- ✅ 128×32 I2C SSD1306: Smaller, less info displayed
- ❌ SPI displays: Different wiring, requires code changes

---

## Shopping Strategy

### For 1-2 Units: Amazon + Hardware Store

1. Buy enclosure, power supply, wire from **Amazon** ($40)
2. Buy perfboard, resistors, capacitors from **local electronics store** ($8)
3. Buy screws, standoffs from **hardware store** ($5)
4. Total time: 1-2 days
5. Total cost: ~$73

### For 3-5 Units: Digi-Key + Amazon

1. Buy connectors, terminals, precision components from **Digi-Key** ($30)
2. Buy enclosures, power supplies, wire from **Amazon** bulk ($120)
3. Buy ESP32/OLED from **AliExpress** if not urgent ($30)
4. Total time: 1-2 weeks (waiting for AliExpress)
5. Total cost: ~$180 (3 units) = $60/unit

### For 10+ Units: Bulk Suppliers

1. Get quote from **Jameco** or **Newark** for volume pricing
2. Order custom PCBs from **OSH Park** or **PCBWay** instead of perfboard
3. Buy wire spools in bulk
4. Expect 30-40% cost reduction at 10+ units

---

## Next Steps

1. **Choose your build tier**: Budget, Standard, or Premium
2. **Review the shopping list** above
3. **Order components** from your preferred suppliers
4. **Proceed to Assembly Guide** once parts arrive

**Estimated lead time**:
- Amazon Prime: 1-2 days
- Digi-Key: 2-3 days
- AliExpress: 2-4 weeks

