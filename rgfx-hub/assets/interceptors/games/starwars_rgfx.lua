-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- Star Wars (Atari 1983) RGFX Interceptor
-- Hardware: Motorola MC6809E @ 1.512 MHz (big-endian)

local ram = require("ram")

-- Skip attract mode and RAM tests
ram.set_boot_delay(2)

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

print("=== Star Wars RGFX Interceptor Loaded ===")

-- Score delta to event lookup table
local SCORE_EVENTS = {
	[33] = "starwars/enemy/destroy/fireball",
	[100] = "starwars/enemy/destroy/turret",
	[200] = "starwars/enemy/destroy/laser-bunker",
	[400] = "starwars/enemy/destroy/laser-tower",
	[600] = "starwars/enemy/destroy/laser-tower",
	[800] = "starwars/enemy/destroy/laser-tower",
	[1200] = "starwars/enemy/destroy/laser-tower",
	[1400] = "starwars/enemy/destroy/laser-tower",
	[1600] = "starwars/enemy/destroy/laser-tower",
	[1000] = "starwars/enemy/destroy/tie",
	[2000] = "starwars/enemy/destroy/vader",
	[5000] = "starwars/bonus/wave",
	[10000] = "starwars/bonus/wave",
	[15000] = "starwars/bonus/wave",
	[20000] = "starwars/bonus/wave",
	[30000] = "starwars/bonus/wave",
	[35000] = "starwars/bonus/wave",
	[40000] = "starwars/bonus/wave",
	[50000] = "starwars/bonus/towers",
	[100000] = "starwars/bonus/force",
	[400000] = "starwars/bonus/difficulty",
	[800000] = "starwars/bonus/difficulty",
}

-- Track previous score for delta detection
local last_score = 0

-- BCD score decoder (4 bytes = 8 digits, big-endian)
local function decode_bcd_score(value)
	local score = 0
	for i = 3, 0, -1 do
		local byte = (value >> (i * 8)) & 0xFF
		local hi = (byte >> 4) & 0x0F
		local lo = byte & 0x0F
		score = score * 100 + hi * 10 + lo
	end
	return score
end

-- RAM monitor map
-- Addresses from MAME cheat.dat: $485C-$485F=Score, $4860=Shields, $4841=Game state
local map = {
	-- Score tracking (4 bytes BCD, big-endian)
	player_score = {
		addr_start = 0x485C,
		size = 4,
		callback_changed = function(current, _)
			local score = decode_bcd_score(current)
			local delta = score - last_score

			_G.event("starwars/player/score", score)

			if delta > 0 then
				local event = SCORE_EVENTS[delta]
				if event then
					_G.event(event, delta)
				else
					-- print(string.format("UNKNOWN SCORE DELTA: +%d", delta))
				end
			end

			last_score = score
		end,
	},

	shields = {
		addr_start = 0x4860,
		callback_changed = function(current, previous)
			-- print(string.format("SHIELDS 0x4860: %d -> %d", previous, current))
			if current < previous then
				_G.event("starwars/player/shield-reduced", current)
			end
		end,
	},

	-- Game state: 0x0E=difficulty select, 0x30=trench, 0x11-0x16=explosion sequence
	game_state = {
		addr_start = 0x4841,
		size = 1,
		callback_changed = function(current, previous)
			_G.event("starwars/game/state", current)
			-- print(string.format("$4841 (game state): 0x%02X -> 0x%02X", previous, current))
			-- Detect transition to explosion visual (0x12 -> 0x13 = concentric rings start)
			if previous == 0x12 and current == 0x13 then
				_G.event("starwars/enemy/destroy/death-star")
			end
		end,
	},
}

ram.install_monitors(map, mem)

-- print("=== STARWARS INTERCEPTOR v9 ===")

-- Fire button detection via ioport
-- IN0 bit 7 (0x80): 1 = not pressed, 0 = pressed (active low)
local prev_fire = false

local function check_fire_button()
	local in0_port = manager.machine.ioport.ports[":IN0"]
	if not in0_port then return end

	local val = in0_port:read()
	local fire_pressed = (val & 0x80) == 0  -- active low

	-- Detect rising edge (button just pressed)
	if fire_pressed and not prev_fire then
		_G.event("starwars/player/fire")
	end

	prev_fire = fire_pressed
end

emu.register_frame_done(check_fire_button, "fire_button")