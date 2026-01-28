-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Sound command byte at 0x618002 (low byte contains the command ID)
-- Command ranges:
--   0x00       = nothing
--   0x01-0x3F  = music tracks
--   0x40+      = sound effects (TBD)
--   0x40-0x41  = insert coin
--   0x42       = move character selection box
--   0x43       = confirm character selection
--   0x44       = ding dong?
--   0x45       = rising bell?
--   0x46-0x48  = swipe S-M-L
--   0x49-0x4B  = punch S-M-L
--   0x4C-0x4E  = kick S-M-L
--   0x4F-0x50  = fall M-L
--   0x51       = thwump?
--   0x52       = glass break
--   0x53       = big smash (wooden?)
--   0x54       = small smash
--   0x55-0x56  = electric M-S
--   0x57       = nothing
--   0x58-05D   = misc
--   0x5E       = jet liner
--   0x5F       = elephant
--   0x60       = "soruken"
--   0x61       = "haduken"
--   0x62       = "thelacksabirjas"
--   0x63       = "huh"
--   0x64       = "urgh" echoed - die?
--   0x65       = "soruken" v2
--   0x66       = "haduken" v2
--   0x67       = "thelacksabirjas" v2
--   0x68       = "ya"
--   0x69       = "urgha" echoed - die?
--   0x6A       = "spinning bird kick"
--   0x6B       = chun li "yoh"
--   0x6C       = chun li "ayh"
--   0x6D       = chun li "scorkin"
--   0x6E       = chun li "laugh"
--   0x6F       = chun li "ya ta"

local SOUND_CMD_ADDR = 0x618002
local prev_cmd = 0

emu.register_frame_done(function()
	local val = mem:read_u16(SOUND_CMD_ADDR)
	local cmd = val & 0x00FF -- Low byte is the command

	if cmd ~= prev_cmd and cmd ~= 0x00 and cmd ~= 0xFF then
		print(string.format("SND: 0x%02X", cmd))
		_G.event("ssf2/sound/cmd", cmd)
	end
	prev_cmd = cmd
end)

local ambilight = require("ambilight")

ambilight.init({
	zones = 16,
	depth = 12,
	event_interval = 4,
  brightness = 0.7,
})
