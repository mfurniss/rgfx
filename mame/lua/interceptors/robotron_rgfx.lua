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

-- Track previous lives for death detection
local previous_lives = nil

-- Memory address map for Robotron: 2084
-- Addresses from Sean Riddle's disassembly (http://www.seanriddle.com/robomame.asm)
local map = {
	-- Player 1 score (4-byte BCD at 0xBDE4)
	player_one_score = {
		addr_start = 0xBDE4,
		addr_end = 0xBDE7,
		callback = function(_, _, _)
			local score = decode_bcd_score(0xBDE4)
			_G.event("robotron/player/score/p1", score)
		end,
	},

	-- Lives remaining (1 byte at 0xBDEC)
	player_lives = {
		addr_start = 0xBDEC,
		callback = function(_, current, previous)
			_G.event("robotron/player/lives", current)
			-- Detect death: lives decreased
			if previous ~= nil and current < previous and current >= 0 then
				_G.event("robotron/player/die", previous - current)
			end
		end,
	},

	-- Wave number (1 byte at 0xBDED)
	wave_number = {
		addr_start = 0xBDED,
		callback = function(_, current, previous)
			_G.event("robotron/wave/number", current)
			-- Detect wave advance
			if previous ~= nil and current > previous then
				_G.event("robotron/wave/complete", previous)
			end
		end,
	},

	-- Lasers fired counter (increments on fire)
	lasers_fired = {
		addr_start = 0x9887,
		callback = function(_, current, previous)
			if previous ~= nil and current > previous then
				-- Read fire direction at time of shot
				local h_dir = mem:read_u8(0x9888)
				local v_dir = mem:read_u8(0x9889)
				local direction = get_fire_direction(h_dir, v_dir)
				_G.event("robotron/player/fire", direction)
			end
		end,
	},

	-- Enforcer count on screen
	enforcer_count = {
		addr_start = 0x98ED,
		callback = function(_, current, previous)
			_G.event("robotron/enemy/enforcer/count", current)
			-- Detect enforcer spawn
			if previous ~= nil and current > previous then
				_G.event("robotron/enemy/enforcer/spawn", current - previous)
			end
			-- Detect enforcer destroyed
			if previous ~= nil and current < previous then
				_G.event("robotron/enemy/enforcer/destroyed", previous - current)
			end
		end,
	},

	-- Spark count (enforcer missiles)
	spark_count = {
		addr_start = 0x988A,
		callback = function(_, current, _)
			_G.event("robotron/enemy/spark/count", current)
		end,
	},

	-- Cruise missile count
	cruise_count = {
		addr_start = 0x988E,
		callback = function(_, current, _)
			_G.event("robotron/enemy/cruise/count", current)
		end,
	},

	-- Electrode count
	electrode_count = {
		addr_start = 0x9892,
		callback = function(_, current, _)
			_G.event("robotron/enemy/electrode/count", current)
		end,
	},
}

-- Install all RAM monitors
for name, config in pairs(map) do
	ram.install_ram_monitor({
		mem = cpu.spaces["program"],
		start_addr = config.addr_start,
		end_addr = config.addr_end,
		name = name,
		callback = config.callback,
		size = config.size,
	})
end
