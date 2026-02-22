-- Super Hang-On Sound Interceptor
-- Monitors YM2151 FM channels via Z80 sound CPU work RAM polling.
--
-- Emits: shangon/music/fm  (pipe-delimited hex pairs)
--   Format: XX|XX|XX|XX|XX|XX|XX|XX  (8 FM channels)
--     '..'    = silent (no note playing)
--     '00'-'FF' = pitch (0=lowest, FF=highest)

local ambilight = require("ambilight")

-- ============================================================================
-- YM2151 FM Note Tracking
-- ============================================================================

-- Z80 sound driver channel blocks in work RAM:
--   Base: 0xF820, stride: 0x28, 8 FM channels (0-7)
--   +0x00: flags (bit 7 = channel active)
--   +0x0C: duration counter (resets to low value on new note)
--   +0x12: KC note value (written to YM2151 reg 0x28+ch)
--          0xFF = rest/key-off
local FM_BLOCK_BASE = 0xF820
local FM_BLOCK_STRIDE = 0x28
local FM_NOTE_OFFSET = 0x12
local FM_FLAG_OFFSET = 0x00
local FM_DUR_OFFSET = 0x0C

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
-- Shared state
-- ============================================================================

local soundcpu = nil
local mem = nil

local prev_fm_ch = {}   -- Per-channel hex value from previous frame
local prev_fm_dur = {}  -- Per-channel duration counter from previous frame

local function init()
	soundcpu = manager.machine.devices[":soundcpu"]
	if not soundcpu then
		print("[SHANGON] ERROR: :soundcpu not found")
		return false
	end
	mem = soundcpu.spaces["program"]
	if not mem then
		print("[SHANGON] ERROR: program space not available")
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
			local prev_dur = prev_fm_dur[ch] or 0
			local wrapped = dur < 10 and prev_dur > 240
			local retriggered = not wrapped and dur > 0 and dur < prev_dur
			-- Only emit on note onset: channel was silent, or duration
			-- counter reset. Ignores pitch bends which change KC every
			-- frame and can wrap past octave 7.
			local note_onset = prev_fm_ch[ch] == ".." or retriggered
			if note_onset then
				events[ch + 1] = hex
				has_event = true
			else
				events[ch + 1] = ".."
			end
			prev_fm_ch[ch] = hex
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
		_G.event("shangon/music/fm", table.concat(events, "|"))
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
		poll_fm()
	end
end, "shangon_sound_monitor")

ambilight.init({
	zones = 12,
	depth = 10,
	event_interval = 3,
})
