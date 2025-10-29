-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

-- Set boot delay to skip RAM test phase (6 seconds)
ram.set_boot_delay(6)

local cpu = manager.machine.devices[":maincpu"]

local function get_player_score(dword)
	local score = 0
	-- Process 4 bytes (32 bits) as BCD
	for i = 3, 0, -1 do
		local byte = (dword >> (i * 8)) & 0xFF
		local hi = (byte >> 4) & 0x0F -- Upper 4 bits (high nibble)
		local lo = byte & 0x0F -- Lower 4 bits (low nibble)
		score = score * 100 + hi * 10 + lo
	end

	return score
end

-- https://github.com/BleuLlama/GameDocs/blob/master/disassemble/mspac.asm

local map = {
	player_one_score = {
		addr_start = 0x4E80,
		size = 4,
		callback = function(_, current, _)
			local current_score = get_player_score(current)
			_G.event("player/score/p1", current_score)
		end,
	},
	power_pill = {
		addr_start = 0x4DA6,
		callback = function(_, current, _)
			_G.event("player/pill/state", current)
		end,
	},
	-- GHOST STATES
	-- 0x01 = red (normal)
	-- 0x03 = pink (normal)
	-- 0x05 = cyan (normal)
	-- 0x07 = orange (normal)
	-- 0x11 (17) = blue (vulnerable - power pill active)
	-- 0x12 (18) = white (flashing - power pill wearing off)
	-- 0x18 (24) = score display (200/400/800/1600 - ghost being eaten)
	-- 0x19 (25) = eyes (returning to ghost home after being eaten)
	-- 0x1d (29) = cutscene color (intermissions only)
	red_ghost_state = {
		addr_start = 0x4C03,
		callback = function(_, current, _)
			_G.event("ghost/red/state", current)
		end,
	},
	pink_ghost_state = {
		addr_start = 0x4C05,
		callback = function(_, current, _)
			_G.event("ghost/pink/state", current)
		end,
	},
	cyan_ghost_state = {
		addr_start = 0x4C07,
		callback = function(_, current, _)
			_G.event("ghost/cyan/state", current)
		end,
	},
	orange_ghost_state = {
		addr_start = 0x4C09,
		callback = function(_, current, _)
			_G.event("ghost/orange/state", current)
		end,
	},
}

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
