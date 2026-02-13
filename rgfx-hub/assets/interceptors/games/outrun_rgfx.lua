-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- OutRun Sound Interceptor
-- Monitors both YM2151 FM channels and SegaPCM channels via Z80 sound
-- CPU work RAM polling.
--
-- Emits: outrun/music/fm  (pipe-delimited hex pairs)
--   Format: XX|XX|XX|XX|XX|XX|XX|XX  (8 FM channels)
--     '..'    = silent (no note playing)
--     '00'-'FF' = pitch (0=lowest, FF=highest)
--
-- Emits: outrun/music/pcm  (pipe-delimited hex pairs, currently disabled)
--   Format: XX|XX|XX|...|XX  (16 PCM channels)
--     '..'    = inactive
--     '00'-'FF' = playback rate

local ambilight = require("ambilight")

-- ============================================================================
-- YM2151 FM Note Tracking
-- ============================================================================

-- Z80 sound driver channel blocks in work RAM:
--   Base: 0xF820, stride: 0x20, 8 FM channels (0-7)
--   +0x00: flags (bit 7 = channel active)
--   +0x03: duration counter (increments by 2/frame, resets to 0-2 on new note)
--   +0x13: KC note value (written to YM2151 reg 0x28+ch)
--          0xFF = rest/key-off
local FM_BLOCK_BASE = 0xF820
local FM_BLOCK_STRIDE = 0x20
local FM_NOTE_OFFSET = 0x13
local FM_FLAG_OFFSET = 0x00
local FM_DUR_OFFSET = 0x03

-- YM2151 KC note code to semitone index (non-linear Yamaha encoding)
local NOTE_INDEX = {
	[0x0] = 0,  [0x1] = 1,  [0x2] = 2,
	[0x4] = 3,  [0x5] = 4,  [0x6] = 5,
	[0x8] = 6,  [0x9] = 7,  [0xA] = 8,
	[0xC] = 9,  [0xD] = 10, [0xE] = 11,
}

local function kc_to_hex(kc)
	local octave = (kc >> 4) & 0x07
	local note_idx = NOTE_INDEX[kc & 0x0F]
	if not note_idx then return "00" end
	local pitch = octave * 12 + note_idx -- 0-95
	local hex_val = math.floor(pitch * 255 / 95)
	return string.format("%02X", hex_val)
end

-- ============================================================================
-- SegaPCM Channel Tracking (disabled for now)
-- ============================================================================

-- SegaPCM registers are memory-mapped at 0xF000-0xF0FF in Z80 program space.
-- 16 channels × 8 bytes, split across low (0x00-0x7F) and high (0x80-0xFF):
--   Low +7: delta/frequency (playback rate, 0-255)
--   High +6 (8*ch + 0x86): control (bit 0 = active)
-- local PCM_BASE = 0xF000
-- local PCM_CTRL_OFFSET = 0x86
-- local PCM_DELTA_OFFSET = 7
-- local PCM_STRIDE = 8

-- local function delta_to_char(delta)
-- 	if delta == 0 then return "1" end
-- 	local char_idx = math.floor(delta * 34 / 255) + 1
-- 	return PITCH_CHARS:sub(char_idx, char_idx)
-- end

-- ============================================================================
-- Shared state
-- ============================================================================

local soundcpu = nil
local mem = nil

local prev_fm_ch = {}   -- Per-channel hex value from previous frame
local prev_fm_dur = {}  -- Per-channel duration counter from previous frame
-- local prev_pcm_state = ""

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

	-- Snapshot initial FM state and duration counters
	for ch = 0, 7 do
		local base = FM_BLOCK_BASE + ch * FM_BLOCK_STRIDE
		local active = (mem:read_u8(base + FM_FLAG_OFFSET) & 0x80) ~= 0
		local kc = mem:read_u8(base + FM_NOTE_OFFSET)
		prev_fm_dur[ch] = mem:read_u8(base + FM_DUR_OFFSET)
		if active and kc ~= 0xFF and kc ~= 0x00 then
			prev_fm_ch[ch] = kc_to_hex(kc)
		else
			prev_fm_ch[ch] = ".."
		end
	end

	-- -- Snapshot initial PCM state
	-- local pcm_chars = {}
	-- for ch = 0, 15 do
	-- 	local ctrl = mem:read_u8(PCM_BASE + PCM_CTRL_OFFSET + ch * PCM_STRIDE)
	-- 	if (ctrl & 0x01) ~= 0 then
	-- 		local delta = mem:read_u8(PCM_BASE + ch * PCM_STRIDE + PCM_DELTA_OFFSET)
	-- 		pcm_chars[ch + 1] = delta_to_char(delta)
	-- 	else
	-- 		pcm_chars[ch + 1] = "0"
	-- 	end
	-- end
	-- prev_pcm_state = table.concat(pcm_chars)

	return true
end

local function poll_fm()
	if not mem then return end
	local events = {}
	local has_event = false

	for ch = 0, 7 do
		local base = FM_BLOCK_BASE + ch * FM_BLOCK_STRIDE
		local active = (mem:read_u8(base + FM_FLAG_OFFSET) & 0x80) ~= 0
		local kc = mem:read_u8(base + FM_NOTE_OFFSET)
		local dur = mem:read_u8(base + FM_DUR_OFFSET)

		if active and kc ~= 0xFF and kc ~= 0x00 then
			local hex = kc_to_hex(kc)
			-- Dur counter is uint8, wraps every ~2.1s (128 frames × 2).
			-- Detect wrap so it doesn't trigger false retrigger.
			local prev_dur = prev_fm_dur[ch] or 0
			local wrapped = dur < 10 and prev_dur > 240
			-- Detect retrigger: dur resets to low value (0-2) on new note.
			-- Skip dur=0 (could be note-end); caught next frame via watermark.
			local retriggered = not wrapped and dur > 0 and dur < prev_dur
			if hex ~= prev_fm_ch[ch] or retriggered then
				events[ch + 1] = hex
				has_event = true
			else
				events[ch + 1] = ".."
			end
			prev_fm_ch[ch] = hex
			-- Advance watermark on increment, retrigger, or wrap reset
			if dur >= prev_dur or retriggered or wrapped then
				prev_fm_dur[ch] = dur
			end
		else
			events[ch + 1] = ".."
			prev_fm_ch[ch] = ".."
			prev_fm_dur[ch] = 0
		end
	end

	if has_event then
		_G.event("outrun/music/fm", table.concat(events, "|"))
	end
end

-- local function poll_pcm()
-- 	local chars = {}
-- 	for ch = 0, 15 do
-- 		local ctrl = mem:read_u8(PCM_BASE + PCM_CTRL_OFFSET + ch * PCM_STRIDE)
-- 		local active = (ctrl & 0x01) ~= 0
--
-- 		if active then
-- 			local delta = mem:read_u8(PCM_BASE + ch * PCM_STRIDE + PCM_DELTA_OFFSET)
-- 			chars[ch + 1] = delta_to_char(delta)
-- 		else
-- 			chars[ch + 1] = "0"
-- 		end
-- 	end
--
-- 	local state = table.concat(chars)
-- 	if state ~= prev_pcm_state then
-- 		_G.event("outrun/music/pcm", state)
-- 		prev_pcm_state = state
-- 	end
-- end

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
		poll_fm()
		-- poll_pcm()
	end
end, "outrun_sound_monitor")

ambilight.init({
	zones = 12,
	depth = 10,
	event_interval = 3,
})
