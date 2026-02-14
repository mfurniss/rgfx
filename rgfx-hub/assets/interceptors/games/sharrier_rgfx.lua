-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- Space Harrier Sound Interceptor
-- Monitors YM2203 FM channels via Z80 sound CPU work RAM polling.
--
-- Hardware: Z80A + YM2203 (memory-mapped at D000-D001) + SegaPCM
--
-- Z80 work RAM layout (discovered via RAM analysis):
--   Music FM channels: C020, C040, C060 (stride 0x20, 3 channels)
--     +0x00: flags (bit 7 = active)
--     +0x11: F-Number low byte
--     +0x12: Block/F-Number high byte
--   These hold music pitches and are NOT affected by SFX.
--   The hardware output buffers at C200+ carry SFX during gameplay.
--
-- Emits: sharrier/music/fm  (pipe-delimited hex pairs)
--   Format: XX|XX|XX|..|..|..|..|..  (3 FM channels, padded to 8)
--     '..'    = silent (no note playing)
--     '00'-'FF' = pitch (0=lowest, FF=highest)

local ambilight = require("ambilight")

-- ============================================================================
-- Channel Configuration
-- ============================================================================

local FM_BASE = 0xC020
local FM_STRIDE = 0x20
local FM_CHANNELS = 3

local FLAG_OFFSET = 0x00
local NOTE_LO = 0x11
local NOTE_HI = 0x12

local TOTAL_SLOTS = 8
-- Emit interval: send current state periodically to keep visualizer alive
-- even when pitches sustain. 4 frames = 15 events/sec at 60fps.
local EMIT_INTERVAL = 4

-- ============================================================================
-- Pitch Conversion
-- ============================================================================

local LN2 = math.log(2)
local FNUM_C4 = 617  -- F-Number for C4 reference

local function fnum_to_hex(lo, hi)
	local block = (hi >> 3) & 0x07
	local fnum = ((hi & 0x07) << 8) | lo
	if fnum == 0 then return ".." end
	local semitone = 12 * math.log(fnum / FNUM_C4) / LN2
	local pitch = block * 12 + semitone
	local clamped = math.max(0, math.min(72, pitch))
	return string.format("%02X", math.floor(clamped * 255 / 72))
end

-- ============================================================================
-- State
-- ============================================================================

local soundcpu = nil
local mem = nil

local cur_hex = {}    -- Current hex value per channel
local prev_hex = {}   -- Previous emitted hex per channel
local emit_timer = 0

local function init()
	soundcpu = manager.machine.devices[":soundcpu"]
	if not soundcpu then
		print("[SH-YM] ERROR: :soundcpu not found")
		return false
	end
	mem = soundcpu.spaces["program"]
	if not mem then
		print("[SH-YM] ERROR: program space not available")
		return false
	end

	for ch = 1, FM_CHANNELS do
		cur_hex[ch] = ".."
		prev_hex[ch] = ".."
	end

	print("[SH-YM] Space Harrier interceptor initialized")
	print(string.format("[SH-YM] Music FM channels at 0x%04X, 0x%04X, 0x%04X",
		FM_BASE, FM_BASE + FM_STRIDE, FM_BASE + 2 * FM_STRIDE))
	return true
end

local function poll()
	if not mem then return end

	-- Read current channel state
	local any_active = false
	for ch = 0, FM_CHANNELS - 1 do
		local base = FM_BASE + ch * FM_STRIDE
		local flags = mem:read_u8(base + FLAG_OFFSET)
		local lo = mem:read_u8(base + NOTE_LO)
		local hi = mem:read_u8(base + NOTE_HI)

		if (flags & 0x80) ~= 0 and (lo ~= 0 or hi ~= 0) then
			cur_hex[ch + 1] = fnum_to_hex(lo, hi)
			any_active = true
		else
			cur_hex[ch + 1] = ".."
		end
	end

	-- Check for any pitch change (immediate emit)
	local changed = false
	for ch = 1, FM_CHANNELS do
		if cur_hex[ch] ~= prev_hex[ch] then
			changed = true
			break
		end
	end

	-- Emit on change or at periodic interval (while music is playing)
	emit_timer = emit_timer + 1
	local periodic = any_active and emit_timer >= EMIT_INTERVAL

	if changed or periodic then
		local events = {}
		for ch = 1, FM_CHANNELS do
			-- On change: emit only changed channels (triggers note-on in visualizer)
			-- On periodic: emit current state for all active channels (keeps sustained notes alive)
			if changed and not periodic then
				events[ch] = (cur_hex[ch] ~= prev_hex[ch]) and cur_hex[ch] or ".."
			else
				events[ch] = cur_hex[ch]
			end
			prev_hex[ch] = cur_hex[ch]
		end

		-- Pad to 8 slots
		for i = FM_CHANNELS + 1, TOTAL_SLOTS do
			events[i] = ".."
		end

		-- Only emit if at least one channel has a note
		local has_content = false
		for ch = 1, FM_CHANNELS do
			if events[ch] ~= ".." then
				has_content = true
				break
			end
		end

		if has_content then
			_G.event("sharrier/music/fm", table.concat(events, "|"))
		end
		emit_timer = 0
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
		poll()
	end
end, "sharrier_ym2203_monitor")

ambilight.init({
	zones = 16,
	depth = 12,
	event_interval = 4,
	brightness = 0.7,
})
