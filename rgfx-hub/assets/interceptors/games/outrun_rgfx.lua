-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- OutRun YM2151 FM Note Interceptor
-- Monitors Z80 sound CPU work RAM channel blocks to detect note-on/off
-- events on all 8 FM channels. The music driver stores the KC (Key Code)
-- value at offset +0x13 in each 32-byte channel block.
--
-- Emits: outrun/music/channel <8-char string>
--   Each character represents one FM channel (0-7):
--     '0'     = silent (no note playing)
--     '1'-'9' = low pitch
--     'A'-'Z' = mid to high pitch
--   Emitted whenever any channel's note changes.

-- local ambilight = require("ambilight")

-- ============================================================================
-- YM2151 FM Note Tracking (RAM polling)
-- ============================================================================

-- Z80 sound driver channel blocks in work RAM:
--   Base: 0xF820, stride: 0x20, 8 FM channels (0-7)
--   +0x00: flags (bit 7 = channel active)
--   +0x13: KC note value (written to YM2151 reg 0x28+ch)
--          0xFF = rest/key-off
local BLOCK_BASE = 0xF820
local BLOCK_STRIDE = 0x20
local NOTE_OFFSET = 0x13
local FLAG_OFFSET = 0x00

-- YM2151 KC note code to semitone index (non-linear Yamaha encoding)
local NOTE_INDEX = {
	[0x0] = 0,  [0x1] = 1,  [0x2] = 2,
	[0x4] = 3,  [0x5] = 4,  [0x6] = 5,
	[0x8] = 6,  [0x9] = 7,  [0xA] = 8,
	[0xC] = 9,  [0xD] = 10, [0xE] = 11,
}

-- 35 pitch characters: 1-9 (low), A-Z (mid-high)
local PITCH_CHARS = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

-- Convert KC byte to a pitch character (1-Z)
local function kc_to_char(kc)
	local octave = (kc >> 4) & 0x07
	local note_idx = NOTE_INDEX[kc & 0x0F]
	if not note_idx then return "1" end
	local pitch = octave * 12 + note_idx -- 0-95
	local char_idx = math.floor(pitch * 34 / 95) + 1
	return PITCH_CHARS:sub(char_idx, char_idx)
end

local soundcpu = nil
local mem = nil

-- Per-channel previous KC value (to detect note changes)
local prev_kc = {}

local function init()
	soundcpu = manager.machine.devices[":soundcpu"]
	if not soundcpu then
		print("[OUTRUN] ERROR: :soundcpu not found")
		return false
	end
	mem = soundcpu.spaces["program"]
	if not mem then
		print("[OUTRUN] ERROR: program space not available")
		return false
	end

	for ch = 0, 7 do
		local base = BLOCK_BASE + ch * BLOCK_STRIDE
		prev_kc[ch] = mem:read_u8(base + NOTE_OFFSET)
	end

	print("[OUTRUN] YM2151 RAM monitor initialized (8 FM channels)")
	return true
end

local function poll_channels()
	local changed = false
	local chars = {}

	for ch = 0, 7 do
		local base = BLOCK_BASE + ch * BLOCK_STRIDE
		local active = (mem:read_u8(base + FLAG_OFFSET) & 0x80) ~= 0
		local kc = mem:read_u8(base + NOTE_OFFSET)

		if kc ~= prev_kc[ch] then
			changed = true
			prev_kc[ch] = kc
		end

		if active and kc ~= 0xFF and kc ~= 0x00 then
			chars[ch + 1] = kc_to_char(kc)
		else
			chars[ch + 1] = "0"
		end
	end

	if changed then
		_G.event("outrun/music/channel", table.concat(chars))
	end
end

-- ============================================================================
-- Initialization
-- ============================================================================

local ready = false
local frame_count = 0
local BOOT_FRAMES = 10

emu.register_frame_done(function()
	frame_count = frame_count + 1

	if frame_count == BOOT_FRAMES then
		ready = init()
	end

	if ready and frame_count > BOOT_FRAMES then
		poll_channels()
	end
end, "outrun_ym_monitor")

-- ambilight.init({
-- 	zones = 12,
-- 	depth = 10,
-- 	event_interval = 3,
-- })
