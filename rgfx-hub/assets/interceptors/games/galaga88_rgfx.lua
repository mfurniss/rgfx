-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

local ram = require("ram")

-- Optional: Enable FFT audio analysis for visual effects
local fft = require("fft")
fft.init({
	emit_events = true,
	log_bars = false,
	fps = 15,
	boot_delay = 3,
  devices = { "ymsnd" },
})


ram.set_boot_delay(6)

-- Access RAM via C117's program space (not maincpu which goes through bank switching)
local c117 = manager.machine.devices[":c117"]
local c117_mem = c117.spaces["program"]

-- Score at virtual address 0x300a14 in C117's address space
-- Format: unpacked BCD, 6 digits
local SCORE_ADDR = 0x300a14

local function read_score()
	local b0 = c117_mem:read_u8(SCORE_ADDR)     -- hundred-thousands
	local b1 = c117_mem:read_u8(SCORE_ADDR + 1) -- ten-thousands
	local b2 = c117_mem:read_u8(SCORE_ADDR + 2) -- thousands
	local b3 = c117_mem:read_u8(SCORE_ADDR + 3) -- hundreds
	local b4 = c117_mem:read_u8(SCORE_ADDR + 4) -- tens
	local b5 = c117_mem:read_u8(SCORE_ADDR + 5) -- ones
	return b0 * 100000 + b1 * 10000 + b2 * 1000 + b3 * 100 + b4 * 10 + b5
end

-- Monitor score changes
local last_score = -1

emu.register_frame_done(function()
	local score = read_score()
	if score ~= last_score then
		_G.event("galaga88/player/score/p1", score)
		last_score = score
	end
end)

print("\nGalaga 88 - Score monitoring active")

-- Sound command addresses discovered via research:
-- 0x2ff027: Player fire (bit 0x10 = fire sound)
-- 0x2ff02c: Enemy explosion (bit 0x80 = explosion)
-- 0x2ff026: Various sounds (0x01, 0x02, 0x10 = different effects)

local prev_fire = 0
local prev_explosion = 0
local prev_sound = 0

emu.register_frame_done(function()
	-- Player fire detection (0x2ff027 bit 0x10)
	local fire = c117_mem:read_u8(0x2ff027)
	if (fire & 0x10) ~= 0 and (prev_fire & 0x10) == 0 then
		_G.event("galaga88/player/fire")
	end
	prev_fire = fire

	-- Enemy explosion detection (0x2ff02c bit 0x80)
	local explosion = c117_mem:read_u8(0x2ff02c)
	if (explosion & 0x80) ~= 0 and (prev_explosion & 0x80) == 0 then
		_G.event("galaga88/enemy/destroy")
	end
	prev_explosion = explosion

	-- Other sound effects (0x2ff026)
	-- Note: bit 0x10 is fire input, not a sound effect
	-- local sound = c117_mem:read_u8(0x2ff026)
	-- if sound ~= prev_sound then
	-- 	if (sound & 0x80) ~= 0 and (prev_sound & 0x80) == 0 then
	-- 		print("EVENT: galaga88/sound/music_start")
	-- 		_G.event("galaga88/sound/music_start")
	-- 	end
	-- 	if (sound & 0x02) ~= 0 and (prev_sound & 0x02) == 0 then
	-- 		print("EVENT: galaga88/sound/effect 2")
	-- 		_G.event("galaga88/sound/effect", 2)
	-- 	end
	-- 	if (sound & 0x01) ~= 0 and (prev_sound & 0x01) == 0 then
	-- 		print("EVENT: galaga88/sound/effect 3")
	-- 		_G.event("galaga88/sound/effect", 3)
	-- 	end
	-- end
	-- prev_sound = sound
end, "galaga88_sound")

print("Sound event monitoring active")

