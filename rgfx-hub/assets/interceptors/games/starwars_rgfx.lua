-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- Star Wars (Atari 1983) RGFX Interceptor - TEST VERSION
-- Hardware: Motorola MC6809E @ 1.512 MHz (big-endian)
-- This is a minimal test interceptor to verify memory addresses one at a time

local ram = require("ram")

-- Skip attract mode and RAM tests
ram.set_boot_delay(2)

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

print("=== Star Wars RGFX Test Interceptor Loaded ===")

-- TEST 1: Score detection ($485C-$485F, 4 bytes BCD)
-- Uncomment to test score tracking
local map = {
	test_score = {
		addr_start = 0x485C,
		size = 4,
		callback = function(_, current, previous)
			print(string.format("SCORE RAW: addr=0x485C, current=0x%08X, previous=0x%08X", current, previous))
			_G.event("starwars/test/score-raw", string.format("0x%08X", current))
		end,
	},
}

ram.install_monitors(map, mem)

print("=== Test monitor installed for SCORE at $485C ===")
