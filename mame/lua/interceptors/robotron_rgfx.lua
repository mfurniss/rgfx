-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- Robotron: 2084 RGFX Interceptor
-- Hardware: Motorola MC6809E @ 1MHz (big-endian)
-- Memory map sourced from Sean Riddle's disassembly

package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

-- Boot delay to skip diagnostics and attract mode
ram.set_boot_delay(11)

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
	brain_count = {
		addr_start = 0xBE6E,
		callback_changed = function(current, previous)
			if current < previous then
				_G.event("robotron/enemy/brain/destroy", previous - current)
			end
		end,
	},
	spheroid_count = {
		addr_start = 0xBE6F,
		callback_changed = function(current, previous)
			if current < previous then
				_G.event("robotron/enemy/spheroid/destroy", previous - current)
			end
		end,
	},
	quark_count = {
		addr_start = 0xBE70,
		callback_changed = function(current, previous)
			if current < previous then
				_G.event("robotron/enemy/quark/destroy", previous - current)
			end
		end,
	},
	tank_count = {
		addr_start = 0xBE71,
		callback_changed = function(current, previous)
			if current < previous then
				_G.event("robotron/enemy/tank/destroy", previous - current)
			end
		end,
	},

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
