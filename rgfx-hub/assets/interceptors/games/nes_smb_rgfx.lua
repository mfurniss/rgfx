-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- ram module is loaded via package.path set by rgfx.lua
local ram = require("ram")

-- Super Mario Bros (NES) RAM Map
-- Reference: https://datacrystal.tcrf.net/wiki/Super_Mario_Bros.:RAM_map
-- Disassembly: https://6502disassembly.com/nes-smb/
--
-- This interceptor is shared by multiple SMB variants (smb, smw)
-- The game prefix is passed via _G.game_name

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Get the game name from global (set by rgfx.lua before loading interceptor)
local game_name = _G.game_name or "smb"

-- Helper function to read score (6 digits)
-- Score layout: 0x07DE-0x07E2 stores 5 digits as one byte per digit (ones digit is always 0)
local function get_score()
	local score = 0
	-- Read 5 bytes, each containing one digit (0-9)
	for i = 0, 4 do
		local digit = mem:read_u8(0x07DE + i)
		score = score * 10 + digit
	end
	return score * 10 -- Multiply by 10 since ones digit is always 0
end

-- RAM monitoring map
local map = {
	-- Score - monitor the 5 bytes that store the score (one digit per byte)
	score = {
		addr_start = 0x07DE,
		addr_end = 0x07E2,
		callback = function()
			local score = get_score()
			_G.event(game_name .. "/player/score", string.format("%06d", score))
		end,
	},

	-- Jump detection - player float state (0x00 = grounded, 0x01 = airborne by jumping)
	-- jump = {
	-- 	addr_start = 0x001D,
	-- 	callback = function(_, current, previous)
	-- 		-- Trigger event only when transitioning from grounded (0x00) to jumping (0x01)
	-- 		-- Ignore landing transitions (0x01->0x00) and other state changes
	-- 		if (previous == 0x00 or previous == nil) and current == 0x01 then
	-- 			_G.event(game_name .. "/player/jump", "1")
	-- 		end
	-- 	end,
	-- },

	-- Sound Queue Monitoring for FFT Simulation
	-- Reference: https://gist.github.com/1wErt3r/4048722 (SMB Disassembly)
	-- The sound engine reads these RAM queues every frame and writes to APU

	-- Square Wave 1 Queue ($FF) - melody/harmony notes
	-- sound_square1 = {
	-- 	addr_start = 0x00FF,
	-- 	callback = function(_, current, previous)
	-- 		-- Log every read to see what's happening
	-- 		if current ~= 0x00 and current ~= previous then
	-- 			_G.event(game_name .. "/sound/square1", current)
	-- 		end
	-- 	end,
	-- },

	-- Square Wave 2 Queue ($FE) - melody/harmony notes, coin sound (0x01)
	sound_square2 = {
		addr_start = 0x00FE,
		callback = function(_, current, previous)
			-- Log every read to see what's happening
			if current ~= 0x00 and current ~= previous then
				-- _G.event(game_name .. "/sound/square2", current)
				-- Special handling for coin pickup
				if current == 0x01 then
					_G.event(game_name .. "/player/coin")
				end
			end
		end,
	},

	-- Noise Queue ($FD) - percussion/sound effects
	-- sound_noise = {
	-- 	addr_start = 0x00FD,
	-- 	callback = function(_, current, previous)
	-- 		-- Log every read to see what's happening
	-- 		if current ~= 0x00 and current ~= previous then
	-- 			_G.event(game_name .. "/sound/noise", current)
	-- 		end
	-- 	end,
	-- },

	-- Music track - area music buffer (persistent state, unlike the queue at $FB)
	-- 0x01 = Overworld, 0x02 = Underwater, 0x04 = Underground, 0x08 = Castle, 0x10 = Star, 0x20 = Overworld (transition)
	-- music_track = (function()
	-- 	local last_music = nil
	-- 	return {
	-- 		addr_start = 0x00F4,
	-- 		callback = function(_, current, _)
	-- 			-- Filter out reset signals (0x00) and silent/stop signals (0x80)
	-- 			-- Only publish when music actually changes to a new valid track
	-- 			if current ~= 0x00 and current ~= 0x80 and current ~= last_music then
	-- 				_G.event(game_name .. "/game/music/area", current)
	-- 				last_music = current
	-- 			end
	-- 		end,
	-- 	}
	-- end)(),

	-- Music detection via MusicDataLow ($F5) - the ROM pointer to current song data
	-- Each song has a unique starting address that identifies it
	music_track = (function()
		local last_song = nil
		-- Map starting $F5 values to song names
		local song_map = {
			[0x1C] = "off",
			[0xF9] = "overworld",
			[0x11] = "underworld",
			[0x72] = "death", -- Also used for time warning intro
			[0xB0] = "flag",
			[0xA4] = "castle",
			[0x51] = "castle-victory",
			[0xB8] = "power-star",
			[0x52] = "swimming",
		}
		return {
			addr_start = 0x00F5,
			callback = function(_, current, _)
				local song = song_map[current]
				if song and song ~= last_song then
					_G.event(game_name .. "/music", song)
					last_song = song
				end
			end,
		}
	end)(),

	-- Fireball - counter increments when Mario shoots a fireball
	fireball = {
		addr_start = 0x06CE,
		callback = function(_, current, previous)
			-- Trigger event when counter increments (fireball shot)
			if previous and current > previous then
				_G.event(game_name .. "/player/fireball", "1")
			end
		end,
	},

	-- APU Status Register - detect channel enable/disable for FFT simulation
	-- Reference: https://www.nesdev.org/wiki/APU_registers
	-- $4015 bits: 0=Pulse1, 1=Pulse2, 2=Triangle, 3=Noise, 4=DMC
	-- Note: Cannot monitor write-only sound registers ($4000-$4013) with frame polling
	-- apu_status = (function()
	-- 	local last_pulse1 = nil
	-- 	local last_pulse2 = nil
	-- 	local last_triangle = nil
	-- 	local last_noise = nil
	-- 	return {
	-- 		addr_start = 0x4015,
	-- 		callback = function(_, current, previous)
	-- 			if current ~= previous then
	-- 				-- Detect which channels are active based on bitmask
	-- 				local pulse1 = (current & 0x01) ~= 0
	-- 				local pulse2 = (current & 0x02) ~= 0
	-- 				local triangle = (current & 0x04) ~= 0
	-- 				local noise = (current & 0x08) ~= 0

	-- 				-- Publish individual channel events when they change state
	-- 				if pulse1 ~= last_pulse1 then
	-- 					_G.event(game_name .. "/apu/pulse1", pulse1 and "1" or "0")
	-- 					print(string.format("APU PULSE1: %s", pulse1 and "ON" or "OFF"))
	-- 					last_pulse1 = pulse1
	-- 				end

	-- 				if pulse2 ~= last_pulse2 then
	-- 					_G.event(game_name .. "/apu/pulse2", pulse2 and "1" or "0")
	-- 					print(string.format("APU PULSE2: %s", pulse2 and "ON" or "OFF"))
	-- 					last_pulse2 = pulse2
	-- 				end

	-- 				if triangle ~= last_triangle then
	-- 					_G.event(game_name .. "/apu/triangle", triangle and "1" or "0")
	-- 					print(string.format("APU TRIANGLE: %s", triangle and "ON" or "OFF"))
	-- 					last_triangle = triangle
	-- 				end

	-- 				if noise ~= last_noise then
	-- 					_G.event(game_name .. "/apu/noise", noise and "1" or "0")
	-- 					print(string.format("APU NOISE: %s", noise and "ON" or "OFF"))
	-- 					last_noise = noise
	-- 				end

	-- 				-- Also publish overall status
	-- 				_G.event(game_name .. "/apu/status", current)
	-- 			end
	-- 		end,
	-- 	}
	-- end)(),

	-- Note Length Counters - detect when new notes start playing
	-- Reference: https://github.com/MitchellSternke/SuperMarioBros-C/blob/master/docs/smbdis.asm
	-- These counters decrement each frame while a note plays. When they reload to a high value, a new note started.

	-- Square 1 Note Length Counter ($07B6) - Channel 1
	-- squ1_note = {
	-- 	addr_start = 0x07B6,
	-- 	callback = function(_, current, previous)
	-- 		-- Detect new note when counter reloads (increases significantly)
	-- 		if previous and current > previous + 10 then
	-- 			_G.event(game_name .. "/sound/channel/1", "note_on")
	-- 		end
	-- 	end,
	-- },

	-- Square 2 Note Length Counter ($07B4) - Channel 2
	-- squ2_note = {
	-- 	addr_start = 0x07B4,
	-- 	callback = function(_, current, previous)
	-- 		-- Detect new note when counter reloads (increases significantly)
	-- 		if previous and current > previous + 10 then
	-- 			_G.event(game_name .. "/sound/channel/2", "note_on")
	-- 		end
	-- 	end,
	-- },

	-- Triangle Note Length Counter ($07B9) - Channel 3
	-- tri_note = {
	-- 	addr_start = 0x07B9,
	-- 	callback = function(_, current, previous)
	-- 		-- Detect new note when counter reloads (increases significantly)
	-- 		if previous and current > previous + 10 then
	-- 			_G.event(game_name .. "/sound/channel/3", "note_on")
	-- 		end
	-- 	end,
	-- },

	-- Noise Beat Length Counter ($07BA) - Channel 4
	-- noise_beat = {
	-- 	addr_start = 0x07BA,
	-- 	callback = function(_, current, previous)
	-- 		-- Detect new beat when counter reloads (increases significantly)
	-- 		if previous and current > previous + 10 then
	-- 			_G.event(game_name .. "/sound/channel/4", "note_on")
	-- 		end
	-- 	end,
	-- },
}

-- Send initialization event to inform Hub which game is running
-- This allows Hub to load the correct game-specific mapper
_G.event(game_name .. "/init", "1")

ram.install_monitors(map, mem)

-- Optional: Enable FFT audio analysis for visual effects
-- Uncomment to enable FFT events and/or console bar graph
-- local fft = require("fft")
-- fft.init({
-- 	game_name = game_name,
-- 	emit_events = true, -- Send FFT data via events
-- 	log_bars = true, -- Show bar graph in console
-- 	fps = 10,
-- })
