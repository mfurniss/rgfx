# RGFX Driver Enclosure - Assembly Guide

Step-by-step instructions for assembling the RGFX Driver enclosure with external 5V power supply.

**Difficulty**: Intermediate
**Time Required**: 3-4 hours (first build), 2 hours (subsequent builds)
**Skill Level**: Basic soldering, drilling, wire routing

---

## Before You Begin

### Safety First

⚠️ **READ THIS SECTION COMPLETELY BEFORE STARTING**

**Electrical Safety:**
- Always disconnect power before making changes
- Verify voltage with multimeter before connecting ESP32
- Use proper fuse protection (5A fuse is MANDATORY)
- **Capacitor polarity matters** - installing backwards will cause explosion!
- Barrel jack center pin must be POSITIVE (+)

**Tool Safety:**
- Wear safety glasses when drilling
- Use well-ventilated area for soldering
- Keep soldering iron in stand when not in use
- Let components cool before handling

**Component Handling:**
- ESP32 and OLED are static-sensitive - use ESD precautions
- Don't overtighten screws on plastic enclosures
- Heat shrink tubing BEFORE soldering connections

### Required Tools

- [ ] Soldering iron (40W minimum, temperature controlled preferred)
- [ ] Solder (60/40 or lead-free, 0.8mm diameter)
- [ ] Wire strippers (18-24 AWG)
- [ ] Flush cutters
- [ ] Multimeter (essential for testing!)
- [ ] Drill with bits: 5mm, 8mm, 11mm, 32mm (or step bit)
- [ ] Screwdrivers: Phillips #1, small flathead
- [ ] Heat gun or lighter (for heat shrink)
- [ ] Helping hands or PCB holder (recommended)
- [ ] Ruler and marker
- [ ] File or sandpaper (for deburring holes)

### Assembly Checklist

Print this checklist and check off each step:

- [ ] All components received and verified against BOM
- [ ] Workspace cleaned and organized
- [ ] Tools gathered and ready
- [ ] Multimeter has fresh battery
- [ ] Soldering iron tested and tinned
- [ ] Power supply verified as 5V center positive
- [ ] Read entire guide before starting

---

## Phase 1: Enclosure Preparation

**Goal**: Prepare the enclosure with all necessary holes and cutouts.

### Step 1.1: Mark Hole Locations

**Back panel holes:**

```
Back Panel Template (view from outside):

    ┌─────────────────────────────────────┐
    │                                     │
    │         (center line)               │
    │              │                      │
    │         ┌────●────┐                 │ ← 25mm from top
    │         │ Barrel  │   11mm hole     │
    │         │  Jack   │                 │
    │         └─────────┘                 │
    │                                     │
    │         ┌─────────┐                 │ ← 50mm from top (optional)
    │         │ USB-C   │   8mm×3mm slot  │
    │         └─────────┘                 │
    │                                     │
    │   ●     ●     ●     ●               │ ← 15mm from bottom
    │  OUT-1 OUT-2 OUT-3 OUT-4            │
    │  (4× rectangular holes 15×6mm)      │
    │  Spaced 20mm apart                  │
    │                                     │
    └─────────────────────────────────────┘

Measurements:
- Barrel jack: 11mm diameter, centered, 25mm from top edge
- USB-C (optional): 8mm×3mm slot, centered, 50mm from top edge
- Screw terminals: 15mm×6mm rectangles, 15mm from bottom, spaced 20mm apart
  (Start 20mm from left edge)
```

**Top panel cutout:**

```
Top Panel Template (view from outside):

    ┌─────────────────────────────────────┐
    │                                     │
    │  ┌───────────────────────────────┐  │
    │  │                               │  │ ← 10mm from edges
    │  │   130mm × 66mm rectangle      │  │
    │  │   (OLED display window)       │  │
    │  │                               │  │
    │  │   Centered on panel           │  │
    │  │                               │  │
    │  └───────────────────────────────┘  │
    │                                     │
    └─────────────────────────────────────┘
```

**Marking tips:**
- Use ruler and marker for precise measurements
- Double-check all measurements before drilling
- Mark center points with center punch or nail
- Tape paper template to enclosure for accuracy

### Step 1.2: Drill Holes

**Order of operations** (prevents cracking):

1. **Pilot holes**: Drill 3mm pilot holes at all marked centers
2. **Step up gradually**: For large holes, drill in steps (3mm → 5mm → 8mm → 11mm)
3. **Final size**: Drill to final diameter
4. **Deburr**: File or sand rough edges smooth

**Specific holes:**

**Barrel jack (11mm diameter):**
```
1. Drill 3mm pilot hole
2. Step up: 5mm → 8mm → 11mm
3. Test fit barrel jack - should slide through snugly
4. Deburr both inside and outside edges
```

**USB-C slot (8mm×3mm - optional):**
```
1. Drill two 3mm holes 8mm apart
2. Use file to connect holes into rectangular slot
3. Test fit USB-C connector
4. Deburr and smooth edges
```

**Screw terminal rectangular holes (15mm×6mm each):**
```
For each terminal:
1. Drill 4× 3mm pilot holes at rectangle corners
2. Carefully drill out material between holes
3. Use file to square up rectangle
4. Test fit terminal - should slide through easily
5. Deburr edges

Alternative: Use nibbling tool or step drill for rectangles
```

**OLED window (130mm×66mm rectangle - top panel):**
```
Method 1: Drill and file
1. Drill 8mm corner holes at rectangle corners
2. Drill additional holes along edges (10mm spacing)
3. Use file to connect holes and square up edges
4. Test fit OLED display
5. Smooth all edges with fine file

Method 2: Rotary tool (easier!)
1. Drill 8mm corner holes
2. Use Dremel with cutting wheel to cut between holes
3. File edges smooth and square
4. Much faster than hand filing!
```

### Step 1.3: Clean and Inspect

- [ ] Remove all metal/plastic shavings from inside enclosure
- [ ] Wipe down with damp cloth
- [ ] Inspect all holes for rough edges
- [ ] Test fit all panel-mount components
- [ ] Set enclosure aside to dry completely

**Quality check:**
- All holes are correct size and position
- Edges are smooth (no sharp burrs)
- Panel-mount components fit snugly
- Enclosure is clean and dry

---

## Phase 2: Perfboard Assembly

**Goal**: Build the main power distribution and component mounting board.

### Step 2.1: Plan Component Layout

**Mark perfboard with permanent marker:**

```
Perfboard Layout (100×160mm):

    ┌─────────────────────────────────────────────┐
    │ [Corner]                        [Corner]    │
    │   ●                                   ●     │ ← Standoff holes
    │                                             │
    │  ┌────┐  ┌──────┐                           │ ← Power input area
    │  │Fuse│  │ Cap  │                           │   (Top 20mm)
    │  └────┘  └──────┘                           │
    │    │        │                                │
    │  ──┴────────┴── 5V+ Bus (red wire) ═════════╗
    │                                             ║
    │  ESP32 DevKit Headers:                      ║
    │  ┌──────────────────────────────┐           ║
    │  │ ████████████████████████████ │ ← Female  ║
    │  │ ████████████████████████████ │   headers ║
    │  └──────────────────────────────┘   (2×19)  ║
    │         (80mm length area)                  ║
    │                                             ║
    │  OLED Header (4-pin):                       ║
    │  ┌──────────┐                               ║
    │  │ ████     │ ← 4-pin female header         ║
    │  └──────────┘   (VCC/GND/SDA/SCL)           ║
    │                                             ║
    │  ──────────────── GND Bus (black) ══════════╝
    │                                             │
    │   ●                                   ●     │ ← Standoff holes
    │ [Corner]                        [Corner]    │
    └─────────────────────────────────────────────┘

Leave 10-15mm clearance around edges for mounting
```

**Component spacing:**
- Fuse: 10mm from left edge, 10mm from top
- Capacitor: 30mm from left edge, 10mm from top
- ESP32 headers: Centered, starting 30mm from top
- OLED header: 20mm from right edge, 40mm from top
- Power buses: Run full length along top (5V+) and bottom (GND)

### Step 2.2: Mark and Drill Standoff Holes

**Standoff hole positions** (4mm diameter):

```
Measure from top-left corner:
- Hole 1: 8mm from left, 8mm from top
- Hole 2: 152mm from left (8mm from right), 8mm from top
- Hole 3: 8mm from left, 152mm from top (8mm from bottom)
- Hole 4: 152mm from left, 152mm from top
```

**Drilling:**
1. Mark center points carefully
2. Drill 4mm holes at each standoff location
3. Deburr holes
4. Test fit M3 screws - should pass through easily

### Step 2.3: Solder Power Buses

**CRITICAL**: Solder power buses FIRST before other components!

**5V+ Bus (top of board):**

```
1. Cut 18 AWG red wire: 180mm length
2. Strip 10mm of insulation from each end
3. Tin both ends with solder
4. Route wire along top edge of perfboard
5. Solder to perfboard pads every 20-30mm
6. Create solder "blobs" at connection points:
   - Barrel jack input location
   - ESP32 VIN location
   - OLED VCC location
   - Each terminal +5V output location
```

**GND Bus (bottom of board):**

```
1. Cut 18 AWG black wire: 180mm length
2. Strip 10mm of insulation from each end
3. Tin both ends with solder
4. Route wire along bottom edge of perfboard
5. Solder to perfboard pads every 20-30mm
6. Create solder "blobs" at connection points:
   - Barrel jack GND location
   - ESP32 GND location
   - OLED GND location
   - Each terminal GND output location
```

**Soldering tips:**
- Use plenty of solder for bus connections (high current!)
- Heat both wire and pad before adding solder
- Keep wire flat against perfboard
- Inspect for cold solder joints (should be shiny, not dull)

**Quality check:**
- [ ] Buses run full length of board
- [ ] All solder joints are shiny and solid
- [ ] No solder bridges between 5V+ and GND
- [ ] Wire is securely attached (gentle tug test)

### Step 2.4: Install Fuse Holder

**Inline blade fuse holder:**

```
Position: Top-left corner, in series with 5V+ bus

Connections:
  Barrel Jack (+) ───── Fuse IN ─┬─ Fuse OUT ───── 5V+ Bus
                                 │
                            [5A Fuse]
```

**Soldering:**
1. Cut 18 AWG red wire: 50mm length (barrel jack to fuse in)
2. Strip and tin both ends
3. Solder one end to perfboard at barrel jack input location
4. Solder other end to fuse holder INPUT wire
5. Solder fuse OUTPUT wire to 5V+ bus blob
6. Insert 5A blade fuse into holder
7. Secure fuse holder to perfboard with zip tie or adhesive

**Quality check:**
- [ ] Fuse is 5A rating (verify by looking at fuse)
- [ ] Connections are solid
- [ ] Fuse holder is secure (won't move around)
- [ ] Fuse can be removed and replaced easily

### Step 2.5: Install Capacitor

**1000µF 16V electrolytic capacitor:**

**⚠️ POLARITY CRITICAL:**
- Longer lead = POSITIVE (+) → connects to 5V+ bus
- Shorter lead = NEGATIVE (-) → connects to GND bus
- Stripe on body = NEGATIVE side
- **WRONG POLARITY = EXPLOSION!**

```
Position: Next to fuse, 30mm from left edge

     5V+ Bus ════╗
                 ║
            (+)  ║
         ┌────┐  ║
         │1000│  ║ ← Capacitor body
         │ µF │  ║
         └────┘  ║
            (-)  ║
                 ║
     GND Bus ════╝
```

**Installation:**
1. Identify positive (+) and negative (-) leads
2. Insert capacitor through perfboard holes
   - Positive lead goes toward 5V+ bus
   - Negative lead goes toward GND bus
3. Bend leads 90° to secure
4. Solder positive lead to 5V+ bus
5. Solder negative lead to GND bus
6. Trim excess lead length (leave 2-3mm)

**Quality check:**
- [ ] Capacitor polarity is correct (double-check!)
- [ ] Both leads solidly soldered
- [ ] Capacitor body is stable (not loose)
- [ ] No short between leads

### Step 2.6: Install Female Headers for ESP32

**40-pin female header** (cut to 2×19 pins for ESP32 DevKit):

```
ESP32 DevKit Pinout (38 pins total):

    Left Side (19 pins)      Right Side (19 pins)
    ┌──────────────────┐     ┌──────────────────┐
    │ 3V3              │     │            GND   │
    │ EN               │     │            GPIO23│
    │ GPIO36           │     │            GPIO22│ ← I2C SCL
    │ GPIO39           │     │            GPIO21│ ← I2C SDA
    │ GPIO34           │     │            GPIO19│ ← LED OUT-4
    │ GPIO35           │     │            GPIO18│ ← LED OUT-3
    │ GPIO32           │     │            GPIO5 │
    │ GPIO33           │     │            GPIO17│ ← LED OUT-2
    │ GPIO25           │     │            GPIO16│ ← LED OUT-1
    │ GPIO26           │     │            GPIO4 │
    │ GPIO27           │     │            GPIO2 │
    │ GPIO14           │     │            GPIO15│
    │ GPIO12           │     │            GND   │
    │ GPIO13           │     │            3V3   │
    │ GND              │     │            EN    │
    │ VIN              │     │            GPIO0 │
    │ GPIO3            │     │            GPIO1 │
    │ GPIO1            │     │            GPIO3 │
    │ GPIO2            │     │            GND   │
    └──────────────────┘     └──────────────────┘
```

**Installation:**
1. Cut 40-pin female header strip into 2× 19-pin sections
2. Position headers on perfboard with correct spacing (2.54mm × 15 holes between)
3. Place ESP32 into headers to verify spacing (DO NOT SOLDER YET!)
4. Remove ESP32
5. Tape headers to perfboard to hold in place
6. Solder ONE pin on each header strip
7. Verify alignment by inserting ESP32 again
8. If aligned correctly, solder all remaining pins
9. If misaligned, reheat the single pin and adjust

**Important pin connections to wire:**

From ESP32 headers to buses/terminals:
- **VIN** (right side, pin 16) → 5V+ bus (red 22 AWG wire)
- **GND** (multiple pins) → GND bus (black 22 AWG wire, solder to any GND pin)
- **GPIO16** → Terminal 1 DATA pin (yellow 22 AWG wire)
- **GPIO17** → Terminal 2 DATA pin (orange 22 AWG wire)
- **GPIO18** → Terminal 3 DATA pin (green 22 AWG wire)
- **GPIO19** → Terminal 4 DATA pin (blue 22 AWG wire)
- **GPIO21** (SDA) → OLED header SDA (white 24 AWG wire)
- **GPIO22** (SCL) → OLED header SCL (gray 24 AWG wire)

**Quality check:**
- [ ] Headers are parallel and straight
- [ ] ESP32 fits snugly into headers
- [ ] All pins soldered solidly
- [ ] No solder bridges between adjacent pins

### Step 2.7: Install Female Header for OLED

**4-pin female header** (I2C OLED connection):

```
OLED Pinout (4 pins):
┌─────┬─────┬─────┬─────┐
│ VCC │ GND │ SDA │ SCL │
└─────┴─────┴─────┴─────┘
  │     │     │     │
  │     │     │     └─── GPIO22 (SCL)
  │     │     └───────── GPIO21 (SDA)
  │     └─────────────── GND Bus
  └───────────────────── 5V+ Bus (or 3.3V if OLED requires)
```

**Installation:**
1. Cut 4-pin section from female header strip
2. Position on perfboard (20mm from right edge, 40mm from top)
3. Insert male header pins to hold alignment
4. Solder ONE pin
5. Check alignment
6. Solder remaining 3 pins
7. Remove male alignment pins

**Wire connections:**
1. VCC → 5V+ bus (red 24 AWG wire) **OR** 3.3V from ESP32 if OLED requires 3.3V
2. GND → GND bus (black 24 AWG wire)
3. SDA → ESP32 GPIO21 (white 24 AWG wire)
4. SCL → ESP32 GPIO22 (gray 24 AWG wire)

**Note**: Check your OLED datasheet! Most 128×64 I2C modules accept 5V, but some require 3.3V.

**Quality check:**
- [ ] Header is straight and secure
- [ ] All pins soldered
- [ ] Correct voltage wired to VCC (5V or 3.3V based on OLED spec)

### Step 2.8: Wire GPIO to Terminal Locations

**Data signal wiring** (ESP32 GPIO → Screw Terminal DATA pins):

Use 22 AWG stranded wire, color-coded:
- GPIO16 → Terminal 1: **Yellow**
- GPIO17 → Terminal 2: **Orange**
- GPIO18 → Terminal 3: **Green**
- GPIO19 → Terminal 4: **Blue**

**For each GPIO connection:**

```
1. Measure wire length from ESP32 header pin to terminal location
   (add 50mm extra for routing)
2. Cut wire to length
3. Strip 5mm from both ends
4. Tin both ends with solder
5. Solder one end to ESP32 header pin (GPIO16/17/18/19)
6. Route wire neatly along perfboard edge
7. Create "pigtail" at terminal end (will connect to screw terminal later)
8. Optionally add heat shrink or label to identify GPIO
```

**Wire routing tips:**
- Keep wires flat against perfboard
- Route along edges when possible
- Use cable clips or adhesive to secure
- Keep data wires separated from power wires (reduces noise)

**Quality check:**
- [ ] All 4 GPIO wires soldered to correct pins
- [ ] Wires are color-coded for identification
- [ ] Wires are routed neatly
- [ ] No shorts between wires

### Step 2.9: Test Continuity

**Before proceeding, test all connections with multimeter:**

**Set multimeter to continuity mode** (beeper icon):

1. **5V+ Bus continuity:**
   - Touch probes to different points along 5V+ bus
   - Should beep (continuous connection)
   - Test: Fuse output → ESP32 VIN → OLED VCC → Terminal +5V locations

2. **GND Bus continuity:**
   - Touch probes to different points along GND bus
   - Should beep (continuous connection)
   - Test: Barrel jack GND → ESP32 GND → OLED GND → Terminal GND locations

3. **NO short between 5V+ and GND:**
   - Touch probes: one to 5V+ bus, one to GND bus
   - Should NOT beep (no connection)
   - **If beeps, you have a SHORT CIRCUIT! Find and fix before proceeding!**

4. **GPIO continuity:**
   - Test each GPIO wire from ESP32 header pin to terminal end
   - Should beep for each wire
   - Verify correct GPIO is wired to each color

**Quality check:**
- [ ] All buses have continuity
- [ ] NO short between 5V+ and GND
- [ ] All GPIO wires have continuity
- [ ] All connections verified

---

## Phase 3: Panel Mount Components

**Goal**: Install barrel jack, screw terminals, and USB-C connector to enclosure.

### Step 3.1: Install Barrel Jack

**5.5×2.1mm barrel jack panel mount:**

```
Back Panel Installation:

    Outside View:          Inside View:

    ┌──────────┐           ┌──────────┐
    │  ○○○     │           │     ●●   │ ← Solder pins
    │ ○    ○   │           │  [Nut]   │   (center = +)
    └──────────┘           └──────────┘
```

**Installation:**
1. Insert barrel jack through 11mm hole from outside
2. Thread locking nut onto barrel jack from inside
3. Tighten nut firmly (hand-tight, don't overtighten)
4. Verify barrel jack doesn't rotate

**Wiring:**
1. Identify terminals (usually 3 pins: tip/center=+, sleeve=-, switch)
2. Cut 18 AWG red wire: 100mm length
3. Solder red wire to CENTER/TIP terminal (+)
4. Cut 18 AWG black wire: 100mm length
5. Solder black wire to SLEEVE terminal (-)
6. Add heat shrink tubing over solder joints
7. Leave switch terminal unconnected (or use for power LED indicator)

**Verify polarity with multimeter:**
- Insert 5V power supply barrel plug
- Measure voltage: red wire (+) to black wire (-)
- Should read 4.9-5.1V DC
- **If negative or wrong voltage, STOP and check wiring!**

**Quality check:**
- [ ] Barrel jack is secure and doesn't rotate
- [ ] Polarity verified with multimeter
- [ ] Solder joints are insulated with heat shrink
- [ ] Voltage reads 5V DC

### Step 3.2: Install Screw Terminals

**4× 3-pin screw terminal blocks** (5.08mm pitch):

```
Back Panel - Terminal Installation:

Terminal orientation (from back of enclosure):
┌──────┬──────┬──────┐
│ GND  │ DATA │ +5V  │ ← Screw holes face outward
└──────┴──────┴──────┘
   ▲      ▲      ▲
   │      │      │
   Wire entry from inside enclosure
```

**For each terminal (repeat 4 times):**

1. Insert terminal through rectangular hole from inside
2. Verify screw holes face outward (user side)
3. Secure with built-in clips or small screws (if provided)
4. If no mounting hardware, use small dab of epoxy or hot glue

**Wiring each terminal:**

**Terminal 1 (GPIO16):**
- GND pin: Black 18 AWG wire from GND bus
- DATA pin: Yellow 22 AWG wire from GPIO16
- +5V pin: Red 18 AWG wire from 5V+ bus

**Terminal 2 (GPIO17):**
- GND pin: Black 18 AWG wire from GND bus
- DATA pin: Orange 22 AWG wire from GPIO17
- +5V pin: Red 18 AWG wire from 5V+ bus

**Terminal 3 (GPIO18):**
- GND pin: Black 18 AWG wire from GND bus
- DATA pin: Green 22 AWG wire from GPIO18
- +5V pin: Red 18 AWG wire from 5V+ bus

**Terminal 4 (GPIO19):**
- GND pin: Black 18 AWG wire from GND bus
- DATA pin: Blue 22 AWG wire from GPIO19
- +5V pin: Red 18 AWG wire from 5V+ bus

**Soldering terminal wires:**

```
Method 1: Direct solder (if terminals have solder cups):
1. Tin wire end
2. Insert into terminal solder cup
3. Heat cup and add solder
4. Let cool completely

Method 2: Screw connection (standard screw terminals):
1. Strip 6mm of insulation
2. Tin wire end
3. Insert into terminal screw hole
4. Tighten screw firmly
5. Gently tug wire to verify connection
```

**Quality check (for each terminal):**
- [ ] Terminal is secure in enclosure
- [ ] Screw holes face outward (user accessible)
- [ ] GND wire connected to left pin
- [ ] DATA wire connected to center pin
- [ ] +5V wire connected to right pin
- [ ] All wires are secure (tug test)

### Step 3.3: Install USB-C Connector (Optional)

**USB-C panel mount** (programming port):

```
    Outside:               Inside:
    ┌─────────┐           ┌─────────┐
    │ ≡≡≡≡≡≡≡ │           │ ●●●●●● │ ← Solder pads
    └─────────┘           └─────────┘
                          (typically 4-pin: VCC/GND/D+/D-)
```

**Installation:**
1. Insert USB-C connector through slot/hole from outside
2. Secure with mounting screws or nut
3. This connector is for **programming only** - not connected to perfboard
4. Wiring:
   - Connect directly to ESP32 USB port (if ESP32 has built-in USB)
   - OR leave as convenient programming access point (plug USB cable when needed)

**Note**: Most ESP32 DevKit boards have built-in USB, so this panel-mount connector is optional. It's useful if you want a cleaner external access for programming without opening the enclosure.

**Quality check:**
- [ ] USB-C connector is secure
- [ ] Connector is oriented correctly (upside-down USB-C works both ways, but keep consistent)

---

## Phase 4: Final Assembly

**Goal**: Mount perfboard in enclosure and connect all components.

### Step 4.1: Mount Perfboard Standoffs

**Install M3 brass standoffs to enclosure floor:**

```
Enclosure floor (inside view):

    ●                             ●
    │                             │
    Standoff 8-10mm height
    │                             │
    M3 screw through enclosure floor
    ●                             ●
```

**Installation:**
1. Place M3 × 6mm screw through enclosure floor from outside
2. Thread M3 × 8mm standoff onto screw from inside
3. Tighten standoff hand-tight
4. Repeat for all 4 standoff locations

**Standoff positions should align with perfboard holes (drilled in Step 2.2).**

**Quality check:**
- [ ] All 4 standoffs installed
- [ ] Standoffs are level and straight
- [ ] Perfboard fits onto standoffs (test fit, don't secure yet)

### Step 4.2: Connect Barrel Jack to Perfboard

**Power input wiring:**

1. Route barrel jack red wire (+) to perfboard fuse input location
2. Route barrel jack black wire (-) to perfboard GND bus location
3. Solder red wire to fuse input pad
4. Solder black wire to GND bus blob
5. Use cable clips to secure wires along enclosure wall

**Important**: Leave slack in wires (20-30mm extra) to allow perfboard removal for servicing.

**Quality check:**
- [ ] Red wire (+) connected to fuse input
- [ ] Black wire (-) connected to GND bus
- [ ] Solder joints are solid
- [ ] Wires have slack for movement

### Step 4.3: Connect Screw Terminals to Perfboard

**For each terminal** (4 terminals total):

```
Terminal connections (from perfboard):
- GND wire (black 18 AWG) → Terminal GND pin
- DATA wire (colored 22 AWG) → Terminal DATA pin
- +5V wire (red 18 AWG) → Terminal +5V pin
```

**Connection method** (screw terminals):
1. Strip 6mm from each wire end (if not already done)
2. Tin wire end with solder
3. Insert wire into terminal screw hole
4. Tighten screw firmly
5. Gently tug wire to verify secure connection

**Wire management:**
- Route wires neatly along enclosure walls
- Use cable clips every 30-50mm
- Keep power wires (red/black) separated from data wires (colored)
- Leave slack for perfboard removal

**Quality check (per terminal):**
- [ ] GND wire secure in left pin
- [ ] DATA wire secure in center pin
- [ ] +5V wire secure in right pin
- [ ] Wires routed neatly
- [ ] Slack available for servicing

### Step 4.4: Secure Perfboard to Standoffs

**Final perfboard mounting:**

1. Carefully route all wires
2. Position perfboard onto standoffs
3. Align perfboard holes with standoffs
4. Place M3 × 6mm screw through each perfboard hole
5. Thread screw into standoff
6. Tighten screws gently (don't overtighten - perfboard is fragile!)
7. Verify perfboard is level and stable

**Quality check:**
- [ ] All 4 screws installed
- [ ] Perfboard is level
- [ ] No components touching enclosure walls
- [ ] Wires are not pinched or stressed

### Step 4.5: Install ESP32 into Headers

**ESP32 DevKit installation:**

```
1. Orient ESP32 correctly (USB port toward back panel or side)
2. Align pins with female headers
3. Gently press ESP32 into headers
4. Ensure all pins are fully seated
5. ESP32 should sit flat and stable
```

**Quality check:**
- [ ] ESP32 fully seated in headers
- [ ] All pins inserted (no bent pins)
- [ ] ESP32 is stable (doesn't wobble)
- [ ] USB port is accessible (if using panel-mount USB-C, verify alignment)

### Step 4.6: Install and Connect OLED Display

**OLED mounting options:**

**Option A: M2 screw mount** (if OLED has mounting holes):
1. Mount OLED to top panel using M2 × 6mm screws
2. Connect 4-pin cable: OLED → perfboard header
3. Use JST SM connector or direct solder

**Option B: Foam tape mount** (easier, removable):
1. Apply foam double-sided tape to OLED back
2. Position OLED in top panel window cutout
3. Press firmly to adhere
4. Connect 4-pin cable: OLED → perfboard header

**Wiring OLED:**

```
OLED Module (4 pins):
┌─────┬─────┬─────┬─────┐
│ VCC │ GND │ SDA │ SCL │
└─────┴─────┴─────┴─────┘
   │     │     │     │
   └─────┴─────┴─────┴──── To perfboard 4-pin header
```

**Cable options:**
- **Pre-made JST cable**: Plug and play (recommended)
- **Direct solder**: 4× 24 AWG wires, color-coded (red/black/white/gray)

**Wire lengths**: Measure from OLED position to perfboard header, add 100mm for routing.

**Quality check:**
- [ ] OLED securely mounted
- [ ] All 4 wires connected correctly (VCC/GND/SDA/SCL)
- [ ] Wires routed neatly (not blocking view)
- [ ] Display visible through top panel window

---

## Phase 5: Testing and Power-Up

**Goal**: Safely test the assembled enclosure before first use.

### Step 5.1: Visual Inspection

**Before applying power, inspect everything:**

- [ ] All solder joints are solid (no cold joints)
- [ ] No loose wire strands that could short
- [ ] Capacitor polarity is correct (stripe to GND)
- [ ] Fuse is installed (5A)
- [ ] All wires are insulated (heat shrink on exposed connections)
- [ ] No components touching enclosure walls
- [ ] All screws are tight
- [ ] No tools or debris inside enclosure

### Step 5.2: Continuity and Resistance Tests

**Multimeter tests (power DISCONNECTED):**

**Test 1: 5V+ to GND resistance**
```
Set multimeter to resistance mode (Ω)
Probes: 5V+ bus to GND bus
Expected: >10kΩ (high resistance)
❌ If <100Ω: SHORT CIRCUIT! Find and fix before proceeding!
```

**Test 2: 5V+ bus continuity**
```
Set multimeter to continuity mode (beeper)
Test points:
- Barrel jack (+) to ESP32 VIN
- Barrel jack (+) to OLED VCC
- Barrel jack (+) to each terminal +5V pin
All should beep (continuous connection)
```

**Test 3: GND bus continuity**
```
Set multimeter to continuity mode (beeper)
Test points:
- Barrel jack (-) to ESP32 GND
- Barrel jack (-) to OLED GND
- Barrel jack (-) to each terminal GND pin
All should beep (continuous connection)
```

**Test 4: GPIO continuity**
```
Test each GPIO wire:
- ESP32 GPIO16 to Terminal 1 DATA
- ESP32 GPIO17 to Terminal 2 DATA
- ESP32 GPIO18 to Terminal 3 DATA
- ESP32 GPIO19 to Terminal 4 DATA
All should beep
```

**Test 5: I2C continuity**
```
- ESP32 GPIO21 to OLED SDA (should beep)
- ESP32 GPIO22 to OLED SCL (should beep)
```

### Step 5.3: Initial Power-Up (No ESP32)

**For safety, test power without ESP32 first:**

1. **Remove ESP32 from headers** (if installed)
2. **Remove OLED from header** (if installed)
3. **Connect 5V power supply** to barrel jack
4. **Measure voltages with multimeter:**

```
Set multimeter to DC voltage (20V range)

Measurement points:
- 5V+ bus to GND bus: Should read 4.9-5.1V DC
- Each terminal +5V pin to GND pin: Should read 4.9-5.1V DC
- ESP32 VIN pin to GND pin: Should read 4.9-5.1V DC
- OLED VCC pin to GND pin: Should read 4.9-5.1V DC (or 3.3V if using 3.3V)

✅ If all voltages correct: Proceed to next step
❌ If voltages wrong: DISCONNECT and troubleshoot
```

5. **Check for overheating:**
   - Feel fuse (should be cool)
   - Feel capacitor (should be cool)
   - Feel power wires (should be cool)
   - ❌ If anything is hot: DISCONNECT immediately and find short circuit!

6. **Disconnect power**

### Step 5.4: Power-Up with ESP32 (No LEDs)

**Add ESP32 to test microcontroller:**

1. **Install ESP32 into headers**
2. **Reconnect power**
3. **Observe ESP32:**
   - Should boot normally
   - On-board LED may flash (depending on firmware)
   - ESP32 should not be hot (warm is OK)

4. **If using OLED, install it now:**
   - Connect OLED to 4-pin header
   - OLED should display boot screen (if firmware supports it)
   - If blank, check I2C connections

5. **Let run for 2-3 minutes**
   - Monitor for overheating
   - Verify stable operation
   - Check current draw (if using inline meter): should be 150-300mA

6. **Disconnect power**

### Step 5.5: Full Power-Up with LEDs

**Final test with LED strips connected:**

1. **Connect ONE LED strip to Terminal 1 (GPIO16)**
   - GND to GND
   - DATA to DATA
   - +5V to +5V

2. **Reconnect power**

3. **Observe LED behavior:**
   - LEDs should light up (color depends on firmware)
   - Default firmware shows BLUE during WiFi setup
   - LEDs should be stable (no flickering)

4. **Measure current draw:**
   - With 8 LEDs at medium brightness: ~500-800mA total
   - With 32 LEDs at medium brightness: ~1.5-2A total
   - Should be well below fuse rating (5A)

5. **Add remaining LED strips:**
   - Connect strips to Terminal 2, 3, 4
   - Verify all strips light up
   - Monitor current draw
   - Check for overheating (capacitor, wires, terminals)

6. **Test for 10-15 minutes:**
   - Ensure stable operation
   - No overheating
   - LEDs respond to firmware commands
   - OLED displays status (if installed)

**Quality check:**
- [ ] All voltages correct (5V ±0.2V)
- [ ] ESP32 boots normally
- [ ] OLED displays status
- [ ] All LED strips light up
- [ ] No overheating components
- [ ] Current draw is reasonable (<5A)
- [ ] System runs stably for 15 minutes

---

## Phase 6: Final Touches

**Goal**: Complete the enclosure assembly and prepare for deployment.

### Step 6.1: Cable Management

**Organize internal wiring:**

1. Use cable clips to secure wires along enclosure walls
2. Group related wires together:
   - Power wires (red/black 18 AWG) together
   - Data wires (colored 22 AWG) together
   - I2C wires (white/gray 24 AWG) together
3. Ensure wires have slack for perfboard removal
4. Trim any excess wire length (leave at least 20mm slack)
5. Verify no wires are pinched by perfboard or enclosure

### Step 6.2: Label Outputs

**Add labels to back panel terminals:**

Use label maker, printed labels, or permanent marker:

```
Terminal labels (on enclosure, above each terminal):
┌─────────────────────────────────────────────┐
│  OUT-1         OUT-2         OUT-3    OUT-4 │
│ GPIO 16       GPIO 17       GPIO 18  GPIO 19│
│ ┌──────┐     ┌──────┐     ┌──────┐ ┌──────┐│
│ │●  ●  ●│     │●  ●  ●│     │●  ●  ●│ │●  ●  ●││
│ └──────┘     └──────┘     └──────┘ └──────┘│
│ GND D +5V   GND D +5V   GND D +5V GND D +5V│
└─────────────────────────────────────────────┘
```

**Also label:**
- Barrel jack: "DC 5V 5A (Center +)"
- USB-C (if installed): "Programming Only"

### Step 6.3: Close Enclosure

**Final assembly:**

1. Verify all components are secure
2. Do final visual inspection through top opening
3. Place top panel with OLED display
4. Align enclosure screw holes
5. Install enclosure screws (usually 4 corners)
6. Tighten screws evenly (don't overtighten plastic!)

**Ventilation check:**
- If enclosure has no vent holes, consider drilling 4-6 small holes (3-5mm) on sides
- Position holes away from electronics (near bottom, for passive airflow)

### Step 6.4: External Connection Test

**Test with actual LED strips (external connection):**

1. Prepare LED strip cables with correct connectors
2. Connect to screw terminals:
   ```
   LED Strip Wire Colors (typical WS2812B):
   - Red → +5V terminal
   - White or Green → DATA terminal
   - Black → GND terminal
   ```
3. Tighten terminal screws firmly
4. Power on
5. Verify LEDs light up and respond to firmware
6. Test each output (1-4)

**Quality check:**
- [ ] All outputs working
- [ ] LEDs respond correctly to firmware
- [ ] No flickering or color issues
- [ ] Enclosure stays cool during operation
- [ ] OLED displays correct status

---

## Troubleshooting Guide

### Problem: ESP32 Won't Boot

**Symptoms**: No LED activity, no serial output, ESP32 is cold

**Check:**
1. Measure VIN voltage: Should be 4.9-5.1V
   - If 0V: Check fuse, barrel jack wiring
   - If wrong voltage: Check power supply
2. Check GND connection: Must be solid
3. Try USB-C power directly to ESP32: If works, issue is with VIN wiring
4. Inspect ESP32 pins: Look for bent or missing pins in headers

### Problem: OLED Display is Blank

**Symptoms**: No display output, ESP32 boots normally

**Check:**
1. Measure OLED VCC: Should be 5V (or 3.3V if required)
   - If 0V: Check VCC wiring
2. Check I2C connections:
   - GPIO21 (SDA) to OLED SDA
   - GPIO22 (SCL) to OLED SCL
3. Try I2C scanner code to detect display at address 0x3C
4. Verify firmware has display support compiled in
5. Check for I2C pullup resistors (4.7kΩ on SDA and SCL)

### Problem: LEDs Don't Light

**Symptoms**: ESP32 works, OLED works, but no LED output

**Check:**
1. Measure +5V at terminal: Should be 4.9-5.1V
   - If 0V: Check terminal wiring to 5V+ bus
2. Check GND connection at terminal
3. Verify DATA wire continuity: ESP32 GPIO to terminal DATA pin
4. Test LED strip with known-good power source (might be bad strip)
5. Check FastLED configuration in firmware:
   ```cpp
   // Verify correct GPIO pin
   FastLED.addLeds<WS2812B, 16, GRB>(leds, NUM_LEDS); // GPIO 16
   ```
6. Try different GPIO/terminal to isolate problem

### Problem: LEDs Flicker or Wrong Colors

**Symptoms**: LEDs light up but flicker, wrong colors, or unstable

**Check:**
1. Increase capacitor size: Try 2200µF or add second 1000µF in parallel
2. Check power wire gauge: Use 18 AWG minimum for power
3. Reduce brightness in firmware:
   ```cpp
   FastLED.setBrightness(64); // Lower brightness
   ```
4. Add power injection: For long strips, inject power at both ends
5. Check for voltage drop: Measure +5V at LED strip end (should be >4.5V)
6. Verify GND connection: Must be solid

### Problem: Fuse Keeps Blowing

**Symptoms**: Fuse blows immediately or after a few seconds

**⚠️ SHORT CIRCUIT - SERIOUS PROBLEM!**

**Check:**
1. **Disconnect power immediately!**
2. Measure resistance between 5V+ and GND:
   - Should be >10kΩ
   - If <100Ω, you have a short
3. Inspect for:
   - Loose wire strands between 5V+ and GND
   - Solder bridges on perfboard
   - Damaged LED strips (internal short)
   - Incorrect LED strip polarity
4. Remove all LED strips and test:
   - If fuse doesn't blow, problem is LED strip
   - Test each strip individually to find bad one
5. Check capacitor polarity: Wrong polarity can cause short

### Problem: Components Overheating

**Symptoms**: Fuse, capacitor, or wires are hot to touch

**Check:**
1. Measure current draw: Should be <5A
   - If >5A, reduce LED count or brightness
2. Check wire gauge: Use 18 AWG for power buses
3. Verify fuse rating: Should be 5A (not higher!)
4. Check for partial short: Resistance between 5V+ and GND should be >10kΩ
5. Ensure adequate ventilation: Add vent holes if needed

---

## Maintenance and Servicing

### Regular Maintenance

**Monthly:**
- [ ] Inspect all screw terminal connections (tighten if loose)
- [ ] Check for loose wires or components
- [ ] Verify no signs of overheating (discoloration, melted plastic)
- [ ] Clean dust from enclosure vents (if present)

**Yearly:**
- [ ] Open enclosure and inspect solder joints
- [ ] Check capacitor for bulging or leakage
- [ ] Verify fuse integrity (replace if shows signs of stress)
- [ ] Re-tighten all screws and standoffs

### Replacing Components

**ESP32:**
1. Disconnect power
2. Gently pull ESP32 from headers
3. Insert new ESP32
4. Reconnect power and test

**OLED Display:**
1. Disconnect power
2. Remove OLED from header or mounting screws
3. Install new OLED
4. Reconnect power and test

**Fuse:**
1. Disconnect power
2. Remove blown fuse from fuse holder
3. Insert new 5A fuse
4. Reconnect power and test

**Capacitor:**
1. Disconnect power
2. Desolder old capacitor (note polarity!)
3. Install new 1000µF 16V capacitor (correct polarity!)
4. Solder in place
5. Test with multimeter before applying power

---

## Enclosure Complete!

Congratulations! You've successfully built an RGFX Driver enclosure!

**What you've created:**
- ✅ Professional-looking enclosure with external power
- ✅ Support for 64+ LEDs across 4 outputs
- ✅ Safe power distribution with fusing
- ✅ Removable ESP32 for easy servicing
- ✅ Optional OLED status display
- ✅ Clean, labeled outputs for easy LED connections

**Next steps:**
1. **Upload firmware**: Use USB-C or USB connection to flash RGFX Driver firmware
2. **Configure WiFi**: Connect to driver's WiFi AP and enter network credentials
3. **Connect to Hub**: Verify driver appears in RGFX Hub
4. **Configure LEDs**: Set up LED device configurations via Hub
5. **Connect LED strips**: Wire your LED hardware to screw terminals
6. **Test with game**: Launch a MAME game and see your LEDs react!

**For LED wiring reference**, see: [pinout-reference.md](pinout-reference.md)

**Enjoy your RGFX Driver!** 🎮💡
