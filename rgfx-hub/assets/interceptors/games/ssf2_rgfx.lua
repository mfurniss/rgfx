-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- Super Street Fighter II interceptor
-- Monitors sound commands sent from 68000 to Z80 via the sound latch

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- CPS2 sound command latch address
-- The 68000 writes sound commands here, Z80 reads them
-- Address range: 0x800180-0x800187 (only first byte typically used)
local SOUND_LATCH_START = 0x800180
local SOUND_LATCH_END = 0x800181

-- Track last command to filter duplicates (game sends 0xFF after each real command)
local last_sound_cmd = nil

-- Install write tap to intercept sound commands as they're written
local sound_tap = mem:install_write_tap(
	SOUND_LATCH_START,
	SOUND_LATCH_END,
	"ssf2_sound",
	function(offset, data, mask)
		-- Filter out 0xFF no-op bytes (sent after each command to avoid duplicate detection)
		if data ~= 0xFF and data ~= last_sound_cmd then
			last_sound_cmd = data
			print(string.format("SSF2 Sound: 0x%02X (offset: 0x%06X)", data, offset))
			_G.event("ssf2/sound/cmd", data)
		elseif data == 0xFF then
			last_sound_cmd = nil -- Reset after no-op
		end

		return data -- Pass through unmodified
	end
)

print("SSF2 interceptor loaded - monitoring sound commands at 0x800180")
