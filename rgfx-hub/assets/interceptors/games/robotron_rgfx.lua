-- Robotron: 2084 RGFX Interceptor
-- Hardware: Motorola MC6809E @ 1MHz (big-endian)
-- Memory map sourced from Sean Riddle's disassembly

-- ram module is loaded via package.path set by rgfx.lua
local ram = require("ram")

-- Skip diagnostics and attract mode
boot_delay(13)

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Decode 4-byte BCD score (big-endian, 8 digits total)
local function decode_bcd_score(start_addr)
	local score = 0
	for i = 0, 3 do
		local byte = mem:read_u8(start_addr + i)
		local hi = (byte >> 4) & 0x0F
		local lo = byte & 0x0F
		score = score * 100 + hi * 10 + lo
	end
	return score
end

-- Convert fire direction bytes to cardinal direction string
local function get_fire_direction(h_dir, v_dir)
	-- h_dir: 0xFF=left, 0x01=right, 0x00=none
	-- v_dir: 0xFF=up, 0x01=down, 0x00=none
	local h = h_dir == 0xFF and "left" or (h_dir == 0x01 and "right" or nil)
	local v = v_dir == 0xFF and "up" or (v_dir == 0x01 and "down" or nil)

	if v and h then
		return v .. "-" .. h -- e.g., "up-left", "down-right"
	elseif v then
		return v
	elseif h then
		return h
	end
	return "none"
end

local map = {
	player_one_score = {
		addr_start = 0xBDE4,
		addr_end = 0xBDE7,
		callback_changed = function()
			_G.event("robotron/player/score/p1", decode_bcd_score(0xBDE4))
		end,
	},
	player_lives = {
		addr_start = 0xBDEC,
		callback_changed = function(current, previous)
			_G.event("robotron/player/lives", current)
			if current < previous and current >= 0 then
				_G.event("robotron/player/die", previous - current)
			end
		end,
	},
	wave_number = {
		addr_start = 0xBDED,
		callback_changed = function(current, previous)
			_G.event("robotron/wave/number", current)
			if current > previous then
				_G.event("robotron/wave/complete", previous)
			end
		end,
	},
	lasers_fired = {
		addr_start = 0x9887,
		callback_changed = function(current, previous)
			if current > previous then
				_G.event("robotron/player/fire", get_fire_direction(mem:read_u8(0x9888), mem:read_u8(0x9889)))
			end
		end,
	},
	enforcer_count = {
		addr_start = 0x98ED,
		callback_changed = function(current, previous)
			_G.event("robotron/enemy/enforcer/count", current)
			if current > previous then
				_G.event("robotron/enemy/enforcer/spawn", current - previous)
			elseif current < previous then
				_G.event("robotron/enemy/enforcer/destroy", previous - current)
			end
		end,
	},
	spark_count = {
		addr_start = 0x988A,
		callback_changed = function(current)
			_G.event("robotron/enemy/spark/count", current)
		end,
	},
	cruise_count = {
		addr_start = 0x988E,
		callback_changed = function(current)
			_G.event("robotron/enemy/cruise/count", current)
		end,
	},
	electrode_count = {
		addr_start = 0x9892,
		callback_changed = function(current)
			_G.event("robotron/enemy/electrode/count", current)
		end,
	},

	-- Enemy type counters (0xBE68-0xBE71)
	grunt_count = {
		addr_start = 0xBE68,
		callback_changed = function(current, previous)
			if current < previous then
				_G.event("robotron/enemy/grunt/destroy", previous - current)
			end
		end,
	},
	-- brain_count = {
	-- 	addr_start = 0xBE6E,
	-- 	callback_changed = function(current, previous)
	-- 		if current < previous then
	-- 			_G.event("robotron/enemy/brain/destroy", previous - current)
	-- 		end
	-- 	end,
	-- },
	-- spheroid_count = {
	-- 	addr_start = 0xBE6F,
	-- 	callback_changed = function(current, previous)
	-- 		if current < previous then
	-- 			_G.event("robotron/enemy/spheroid/destroy", previous - current)
	-- 		end
	-- 	end,
	-- },
	-- quark_count = {
	-- 	addr_start = 0xBE70,
	-- 	callback_changed = function(current, previous)
	-- 		if current < previous then
	-- 			_G.event("robotron/enemy/quark/destroy", previous - current)
	-- 		end
	-- 	end,
	-- },
	-- tank_count = {
	-- 	addr_start = 0xBE71,
	-- 	callback_changed = function(current, previous)
	-- 		if current < previous then
	-- 			_G.event("robotron/enemy/tank/destroy", previous - current)
	-- 		end
	-- 	end,
	-- },

	-- Family member counters (0xBE6A-0xBE6C)
	mommie_count = {
		addr_start = 0xBE6A,
		callback_changed = function(current, previous)
			if current < previous then
				_G.event("robotron/family/rescue", "mommie")
			end
		end,
	},
	daddie_count = {
		addr_start = 0xBE6B,
		callback_changed = function(current, previous)
			if current < previous then
				_G.event("robotron/family/rescue", "daddie")
			end
		end,
	},
	mikey_count = {
		addr_start = 0xBE6C,
		callback_changed = function(current, previous)
			if current < previous then
				_G.event("robotron/family/rescue", "mikey")
			end
		end,
	},
}

ram.install_monitors(map, mem)

-- Sound detection via RAM tap
-- The Williams sound board uses PIA registers ($C80E) which are memory-mapped I/O.
-- MAME's install_write_tap only works on RAM, not device-mapped I/O regions.
-- However, we can tap the RAM variables used by the sound priority routine.
--
-- From disassembly of the sound routine at $D3C7:
-- - DP register is set to $98, so direct page addresses are $98XX
-- - $9854-$9855: Sound data pointer (written when new sound starts)
-- - $9856: Current sound priority (written when new sound starts)
-- - $9857: Sound timer
-- - $9858: Sound frame counter
--
-- The existing gameplay events provide equivalent coverage for LED effects:
--   - robotron/player/fire (laser sound)
--   - robotron/player/die (death sound)
--   - robotron/enemy/*/destroy (explosion sounds)
--   - robotron/wave/complete (level transition sound)
--   - robotron/family/rescue (rescue sound)

-- Sound detection: DP=$98 confirmed via MAME debugger
-- Using polling (like ram.lua) since install_write_tap doesn't work on this region
-- Addresses: $9854-$9855 (sound pointer), $9856 (priority)

-- Sound pointer to name lookup table
-- TODO: Play through game to identify all sound start addresses
local sound_lut = {
	[0x001A] = "shoot-hulk",
	[0x001D] = "shoot-hulk",
	[0x0024] = "rescue-human",
	[0x0027] = "rescue-human",
	[0x114D] = "enforcer-spawn",
	[0x114F] = "destroy-spheroid",
	[0x26D7] = "player-death",
	[0x26DA] = "player-death",
	[0x26DF] = "game-start",
	[0x26E2] = "wave_start",
	[0x26E9] = "next-wave",
	[0x26EC] = "next-wave",
	[0x26EE] = "laser",
	[0x26F1] = "laser",
	[0x3896] = "explosion",
	[0x3899] = "explosion",
	[0x389E] = "grunt-move",
	[0x38A1] = "explosion",
	[0x38A3] = "destroy-electrode",
	[0x38A6] = "destroy-electrode",
  [0x4144] = "brain-appear",
	[0x4141] = "brain-appear",
	[0xD0DE] = "wave",
	[0xD0E3] = "wave",
	[0xD0EF] = "huge-explosion",
	[0xD0F2] = "wave",
	[0xEF08] = "sine-wave-boom",
	[0xEF6E] = "attract",
  [0x0029] = "human-die",
  [0x002C] = "human-die",
  [0x114A] = "spark",
  [0x1152] = "destroy-spheroid",
  [0x1154] = "spark",
  [0x1157] = "spark",
  [0x115C] = "destroy-enforcer",
  [0x1ACE] = "human-programming",
  [0x1AE8] = "human-programming",
  [0x1AEB] = "human-programming",
  [0x4B2F] = "tank-appear",
  [0x4B32] = "tank-appear",
  [0xD0C7] = "extra-life",
  [0xD0CA] = "extra-life",
}

local last_sound_ptr = 0

emu.register_frame_done(function()
	local ptr_hi = mem:read_u8(0x9854)
	local ptr_lo = mem:read_u8(0x9855)
	local ptr = (ptr_hi << 8) | ptr_lo

	if ptr ~= last_sound_ptr and ptr > 0 then
		-- Sound data advances by 3 bytes per frame
		-- A new sound starts if pointer didn't just advance by 3
		local is_new_sound = (ptr ~= last_sound_ptr + 3)

		if is_new_sound then
			local name = sound_lut[ptr]
			if not name then
				-- print(string.format("[ROBOTRON] Sound: UNKNOWN ($%04X)", ptr))
      else
        _G.event("robotron/sfx/" .. name)
      end
		end
		last_sound_ptr = ptr
	end
end, "sound_monitor")

print("[ROBOTRON] Sound polling monitor installed for $9854-$9856")
