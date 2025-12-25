# NES Audio Processing Unit (APU) Reference

Technical reference for the NES RP2A03 APU and Super Mario Bros sound engine.

## NES APU Architecture

The NES APU is integrated into the Ricoh RP2A03 (NTSC) / RP2A07 (PAL) CPU chip. It provides 5 audio channels with registers mapped to $4000-$4017.

### Audio Channels

| Channel | Type | Frequency Range | Typical Use |
|---------|------|-----------------|-------------|
| Pulse 1 | Square wave | ~54 Hz - 12.4 kHz | Melody, lead |
| Pulse 2 | Square wave | ~54 Hz - 12.4 kHz | Harmony, countermelody |
| Triangle | Triangle wave | ~27 Hz - 55.9 kHz | Bass, soft melody |
| Noise | Pseudo-random | 29.3 Hz - 447 kHz | Percussion, effects |
| DMC | Delta modulation | Variable | Samples, voice |

---

## APU Register Map

### Pulse Channel 1 ($4000-$4003)

```
$4000: DDLC VVVV
  DD   = Duty cycle (00=12.5%, 01=25%, 10=50%, 11=75%)
  L    = Length counter halt / envelope loop
  C    = Constant volume (1) or envelope (0)
  VVVV = Volume / envelope period

$4001: EPPP NSSS
  E    = Sweep enable
  PPP  = Sweep period
  N    = Negate (0=add, 1=subtract)
  SSS  = Shift count

$4002: TTTT TTTT
  Timer low byte (bits 0-7 of 11-bit period)

$4003: LLLL LTTT
  LLLLL = Length counter load (5 bits)
  TTT   = Timer high byte (bits 8-10 of period)
  ** Writing here triggers note-on (restarts envelope, resets phase) **
```

### Pulse Channel 2 ($4004-$4007)
Same format as Pulse 1.

### Triangle Channel ($4008-$400B)

```
$4008: CRRR RRRR
  C      = Length counter halt / linear counter control
  RRRRRRR = Linear counter reload value

$400A: TTTT TTTT
  Timer low byte

$400B: LLLL LTTT
  LLLLL = Length counter load
  TTT   = Timer high byte
  ** Writing here triggers note-on **
```

### Noise Channel ($400C-$400F)

```
$400C: --LC VVVV
  L    = Length counter halt / envelope loop
  C    = Constant volume flag
  VVVV = Volume / envelope period

$400E: M--- PPPP
  M    = Mode (0=normal, 1=metallic)
  PPPP = Period index (lookup table)

$400F: LLLL L---
  LLLLL = Length counter load
  ** Writing here triggers note-on **
```

### DMC Channel ($4010-$4013)

```
$4010: IL-- RRRR
  I    = IRQ enable
  L    = Loop flag
  RRRR = Rate index

$4011: -DDD DDDD
  Direct load (7-bit DAC value)

$4012: AAAA AAAA
  Sample address = $C000 + (A * 64)

$4013: LLLL LLLL
  Sample length = (L * 16) + 1 bytes
```

### Status/Control ($4015)

```
Read:  IF-D NT21
  I = DMC interrupt
  F = Frame interrupt
  D = DMC active
  N = Noise length counter > 0
  T = Triangle length counter > 0
  2 = Pulse 2 length counter > 0
  1 = Pulse 1 length counter > 0

Write: ---D NT21
  D = Enable DMC
  N = Enable Noise
  T = Enable Triangle
  2 = Enable Pulse 2
  1 = Enable Pulse 1
```

---

## Frequency Calculation

### Pulse Channels
```
Frequency = CPU_CLOCK / (16 * (timer_value + 1))
NTSC: CPU_CLOCK = 1,789,773 Hz
PAL:  CPU_CLOCK = 1,662,607 Hz
```

### Triangle Channel
```
Frequency = CPU_CLOCK / (32 * (timer_value + 1))
(One octave lower than pulse for same timer value)
```

### Timer Value from Frequency
```
timer = (CPU_CLOCK / (16 * frequency)) - 1  [pulse]
timer = (CPU_CLOCK / (32 * frequency)) - 1  [triangle]
```

### Example: A4 (440 Hz) on NTSC
```
Pulse:    timer = (1789773 / (16 * 440)) - 1 = 253 ($FD)
Triangle: timer = (1789773 / (32 * 440)) - 1 = 126 ($7E)
```

---

## Duty Cycle Waveforms

| Value | Duty | Pattern | Sound Character |
|-------|------|---------|-----------------|
| 00 | 12.5% | `_‾______` | Thin, nasal |
| 01 | 25% | `_‾‾_____` | Hollow |
| 10 | 50% | `_‾‾‾‾___` | Full, balanced |
| 11 | 75% | `‾__‾‾‾‾‾` | Same as 25% (inverted) |

---

## Note-On Detection

A new note is triggered when software writes to the length/timer-high register:

| Channel | Note-On Register | Effect |
|---------|------------------|--------|
| Pulse 1 | $4003 | Restarts envelope, resets phase |
| Pulse 2 | $4007 | Restarts envelope, resets phase |
| Triangle | $400B | Reloads linear counter |
| Noise | $400F | Restarts envelope |

**Key insight**: Writing to the low timer byte ($4002, $4006, $400A, $400E) does NOT trigger a new note - only changes pitch of current note.

---

## Super Mario Bros Sound Engine

### Sound Queue Registers (Zero Page)

| Address | Name | Description |
|---------|------|-------------|
| $FA | PauseSoundQueue | Pause sound effects |
| $FB | AreaMusicQueue | Background music (bit flags) |
| $FC | EventMusicQueue | Event music (death, victory) |
| $FD | NoiseSoundQueue | Noise channel SFX |
| $FE | Square2SoundQueue | Pulse 2 SFX |
| $FF | Square1SoundQueue | Pulse 1 SFX |

### Music Type Flags ($FB - AreaMusicQueue)

| Bit | Value | Music |
|-----|-------|-------|
| 0 | $01 | Ground/Overworld |
| 1 | $02 | Water/Underwater |
| 2 | $04 | Underground |
| 3 | $08 | Castle |
| 4 | $10 | Star Power |
| 5 | $20 | Pipe Intro |
| 7 | $80 | Silence |

### Event Music Flags ($FC - EventMusicQueue)

| Bit | Value | Music |
|-----|-------|-------|
| 0 | $01 | Death |
| 1 | $02 | Game Over |
| 2 | $04 | Victory Fanfare |
| 3 | $08 | End of Castle |
| 5 | $20 | Level Complete |
| 6 | $40 | Hurry Up! |
| 7 | $80 | Silence |

### Sound Engine RAM ($07xx)

| Address | Name | Description |
|---------|------|-------------|
| $07B3 | Squ2_NoteLenBuffer | Square 2 note length buffer |
| $07B4 | Squ2_NoteLenCounter | Square 2 note duration countdown |
| $07B5 | Squ2_EnvelopeDataCtrl | Square 2 duty + volume |
| $07B6 | Squ1_NoteLenCounter | Square 1 note duration countdown |
| $07B7 | Squ1_EnvelopeDataCtrl | Square 1 duty + volume |
| $07B8 | Tri_NoteLenBuffer | Triangle note length buffer |
| $07B9 | Tri_NoteLenCounter | Triangle note duration countdown |
| $07BA | Noise_BeatLenCounter | Noise beat duration countdown |
| $07BB | Squ1_SfxLenCounter | Square 1 SFX length |
| $07BD | Squ2_SfxLenCounter | Square 2 SFX length |
| $07BF | Noise_SfxLenCounter | Noise SFX length |

### Music Data Pointers

| Address | Name | Description |
|---------|------|-------------|
| $F5 | MusicDataLow | Music data pointer (low byte) |
| $F6 | MusicDataHigh | Music data pointer (high byte) |
| $F7 | MusicOffset_Square2 | Current offset in Pulse 2 track |
| $F8 | MusicOffset_Square1 | Current offset in Pulse 1 track |
| $F9 | MusicOffset_Triangle | Current offset in Triangle track |
| $07B0 | MusicOffset_Noise | Current offset in Noise track |

---

## MAME Lua Sound Hook API

### Enabling Sound Device Hook

```lua
-- Find and enable NES APU
for tag, sound in pairs(manager.machine.sounds) do
    if tag:find("apu") then
        sound.hook = true
    end
end
```

### Registering Sample Callback

```lua
emu.register_sound_update(function(samples)
    -- samples = { [device_tag] = { [channel] = { sample, sample, ... } } }
    for tag, channels in pairs(samples) do
        for ch_idx, buffer in ipairs(channels) do
            -- buffer contains float samples in -1.0 to 1.0 range
            local peak = 0
            for _, s in ipairs(buffer) do
                peak = math.max(peak, math.abs(s))
            end
            -- peak represents channel amplitude this update
        end
    end
end)
```

---

## Sources

- [NESdev Wiki - APU](https://www.nesdev.org/wiki/APU)
- [NESdev Wiki - APU Registers](https://www.nesdev.org/wiki/APU_registers)
- [NESdev Wiki - APU Period Table](https://www.nesdev.org/wiki/APU_period_table)
- [SMB Disassembly - doppelganger](https://gist.github.com/1wErt3r/4048722)
- [Data Crystal - SMB Notes](https://datacrystal.tcrf.net/wiki/Super_Mario_Bros./Notes)
- [MAME Lua Documentation](https://docs.mamedev.org/luascript/)
