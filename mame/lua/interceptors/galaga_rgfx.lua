-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

-- Set boot delay to skip RAM test phase (16 seconds)
ram.set_boot_delay(16)

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

local function get_galaga_score(start_addr)
	local score = 0
	-- Galaga score in video RAM (6 digits)
	-- start_addr = ones place, ascending addresses for higher digits
	-- Values 0-9 map to themselves, 36 = blank
	-- Read from high to low: start at highest address, work down
	for i = 5, 0, -1 do
		local digit = mem:read_u8(start_addr + i)
		if digit >= 0 and digit <= 9 then
			score = score * 10 + digit
		elseif digit == 36 and score > 0 then
			-- blank in middle of number, treat as 0
			score = score * 10
		end
		-- Skip leading blanks (digit == 36 and score == 0)
	end
	return score
end

-- Galaga Player 1 current score in video RAM at 0x83F8 - 0x83FD
-- Player ship X position at 0x9362 (gameplay buffer, verified via runtime analysis)
--   Range: 0x11 (left edge) to 0xE1 (right edge)
-- Shot counter at 0x9846 (16-bit word, increments when player fires)
-- Hit counter at 0x9844 (increments when enemy destroyed)
local map = {
	player_one_score = {
		addr_start = 0x83F8,
		addr_end = 0x83FD,
		callback = function(_, _, _)
			local score = get_galaga_score(0x83F8)
			_G.event("galaga/player/score/p1", score)
		end,
	},
	player_ship_x = {
		addr_start = 0x9362,
		callback = function(_, current, _)
			_G.event("galaga/player/ship/x", current)
		end,
	},
	player_fired = {
		addr_start = 0x9846,
		size = 2, -- 16-bit word (little-endian)
		callback = function(_, current, previous)
			-- Shot counter increments when player fires
			if current > previous then
				_G.event("galaga/player/fired", current)
			end
		end,
	},
	enemy_destroyed = {
		addr_start = 0x9844,
		callback = function(_, current, previous)
			-- Hit counter increments when enemy is destroyed
			if current > previous then
				_G.event("galaga/enemy/destroyed", current)
			end
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
