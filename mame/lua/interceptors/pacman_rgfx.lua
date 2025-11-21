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
		callback = function(value, _, _)
			local current_score = get_player_score(value)
			_G.event("pacman/player/score/p1", current_score)
		end,
	},
	-- power_pill = {
	-- 	addr_start = 0x4DA6,
	-- 	callback = function(value, _, _)
	-- 		_G.event("pacman/player/pill/state", value)
	-- 	end,
	-- },
	-- -- GHOST STATES
	-- -- 0x01 = red (normal)
	-- -- 0x03 = pink (normal)
	-- -- 0x05 = cyan (normal)
	-- -- 0x07 = orange (normal)
	-- -- 0x11 (17) = blue (vulnerable - power pill active)
	-- -- 0x12 (18) = white (flashing - power pill wearing off)
	-- -- 0x18 (24) = score display (200/400/800/1600 - ghost being eaten)
	-- -- 0x19 (25) = eyes (returning to ghost home after being eaten)
	-- -- 0x1d (29) = cutscene color (intermissions only)
	red_ghost_state = {
		addr_start = 0x4C03,
		callback = function(value, _, _)
			_G.event("pacman/ghost/red/state", value)
		end,
	},
	pink_ghost_state = {
		addr_start = 0x4C05,
		callback = function(value, _, _)
			_G.event("pacman/ghost/pink/state", value)
		end,
	},
	cyan_ghost_state = {
		addr_start = 0x4C07,
		callback = function(value, _, _)
			_G.event("pacman/ghost/cyan/state", value)
		end,
	},
	orange_ghost_state = {
		addr_start = 0x4C09,
		callback = function(value, _, _)
			_G.event("pacman/ghost/orange/state", value)
		end,
	},
	-- SOUND EFFECT MONITORING
	-- Pac-Man uses RAM command registers (0x4E9C, 0x4EAC, 0x4EBC) to queue sound effects
	-- Each byte is an 8-bit bitmask where each bit represents a different sound effect
	-- Game sets bits to trigger sounds, sound routine processes and clears them
	-- Channel 1 (0x4E9C): Background sounds (siren, power pellet music)
	-- Channel 2 (0x4EAC): Gameplay sounds (wakka, ghost eaten, fruit eaten)
	-- Channel 3 (0x4EBC): Special events (death, intermission, credit)

	-- eat power pill - sound_ch2_cmd 0x21
	-- insert coin - sound_ch1_cmd 0x02 - sound_ch1_cmd 0x00
	-- eat dot wakka 1 - sound_ch3_cmd 0x01 - sound_ch3_cmd 0x00
	-- eat dot wakka 2 - sound_ch3_cmd 0x02 - sound_ch3_cmd 0x00
	-- pacman die part 1 - sound_ch3_cmd	0x10
	-- pacman die part 2 - sound_ch3_cmd	0x20
	-- eat ghost - sound_ch2_cmd 0x61

	sound_ch1_cmd = {
		addr_start = 0x4E9C,
		callback_changed = function(value, _)
			if value == 0x02 then
				_G.event("pacman/player/insert-coin")
			end
		end,
	},
	sound_ch2_cmd = {
		addr_start = 0x4EAC,
		callback_changed = function(value, _)
			if value == 0x21 then
				_G.event("pacman/player/eat/power-pill")
			elseif value == 0x61 then
				_G.event("pacman/player/ghost/eyes")
			end
		end,
	},
	sound_ch3_cmd = {
		addr_start = 0x4EBC,
		callback_changed = function(value, _)
			if value == 0x01 or value == 0x02 then
				_G.event("pacman/player/eat/pill", value)
			elseif value == 0x10 then
				_G.event("pacman/player/die", 1)
			elseif value == 0x20 then
				_G.event("pacman/player/die", 2)
			elseif value == 0x04 then
				_G.event("pacman/player/eat/bonus")
			elseif value == 0x08 then
				_G.event("pacman/player/eat/ghost")
			end
		end,
	},
	-- GAME STATE MONITORING
	game_mode = {
		addr_start = 0x4E00,
		callback_changed = function(value, _)
			_G.event("pacman/game/mode", value) -- 1=demo, 2=select p1/p2 game, 3=game started
		end,
	},
	dots_remaining = {
		addr_start = 0x4E0E,
		callback_changed = function(value, _)
			_G.event("pacman/player/dots-remaining", 244 - value)
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
		callback_changed = config.callback_changed,
		size = config.size,
	})
end
