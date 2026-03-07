_G.boot_delay(2)

-- Extract sprites from CHR ROM
local sprite_extract = require("sprite-extract")
sprite_extract.extract({
	gfx_region = ":nes_slot:cart:chr_rom",
	sprite_offset = 0,
	tile_format = {
		format = "nes_2bpp",
		width = 8, height = 8,
		bytes_per_sprite = 16,
	},
	sprites = {
		-- Coin: single 16x16 image from PT1 background tiles
		{ name = "smb-coin", grid = { 2, 2 },
			tiles = { 0x1A5, 0x1A6, 0x1A7, 0x1A8 },
			color_map = { [1] = 0xA, [2] = 0x4, [3] = 0xC } },
		-- Small Mario: standing + 3 walk frames (2x2 grid, 16x16)
		{ name = "smb-mario-small", grid = { 2, 2 }, frames = {
			{ tiles = { 0x3A, 0x37, 0x4F, 0x4F } },  -- standing
			{ tiles = { 0x32, 0x33, 0x34, 0x35 } },  -- walk 1
			{ tiles = { 0x36, 0x37, 0x38, 0x39 } },  -- walk 2
			{ tiles = { 0x3A, 0x37, 0x3B, 0x3C } },  -- walk 3
		}, color_map = { [1] = 0x5, [2] = 0x9, [3] = 0x8 } },
	},
	output_dir = "~/.rgfx/transformers/bitmaps",
})

local ram = require("ram")

-- Super Mario Bros (NES) RAM Map
-- Reference: https://datacrystal.tcrf.net/wiki/Super_Mario_Bros.:RAM_map
-- Disassembly: https://6502disassembly.com/nes-smb/
--
-- This interceptor is shared by multiple SMB variants (smb, smw)
-- The game prefix is passed via _G.rgfx.rom

local mem = manager.machine.devices[":maincpu"].spaces["program"]

-- Get the game name from global (set by rgfx.lua before loading interceptor)
local game_name = (_G.rgfx and _G.rgfx.rom) or "smb"

-- Pre-build topic strings (avoid per-event concatenation)
local topic_score_p1 = game_name .. "/player/score/p1"
local topic_score_p2 = game_name .. "/player/score/p2"
local topic_music    = game_name .. "/music"
local topic_sfx      = game_name .. "/sfx/"

-- Sound effect value maps (from SMB disassembly)
-- Reference: https://gist.github.com/1wErt3r/4048722
local sfx_square1_map = {
	[0x80] = "jump",
	[0x40] = "flagpole",
	[0x20] = "mario-fireball",
	[0x10] = "enter-pipe",
	[0x08] = "kick-shell",
	[0x04] = "stomp-or-swim",
	[0x02] = "block-bump",
	[0x01] = "jump",
}

local sfx_square2_map = {
	[0x01] = "coin",
	[0x02] = "powerup-appear",
	[0x04] = "climb-beanstalk",
	[0x08] = "firework",
	[0x10] = "flagpole",
	[0x20] = "powerup-collect",
	[0x40] = "1up",
	[0x80] = "blast",
}

local sfx_noise_map = {
	[0x01] = "block-smash",
	[0x02] = "bowser-flame",
	[0x04] = "fire",
	[0x08] = "explosion",
}

-- Helper function to read score (5 visible digits × 10, one byte per digit)
-- DisplayDigits ($07D7) layout from SMB disassembly (ScoreOffsets: $0B, $11):
--   DigitsMathRoutine works backwards: Y=$0B→$06 (P1), Y=$11→$0C (P2)
--   $07D7-$07DC: Top/High score (offsets $00-$05, $07D7 zero-suppressed)
--   $07DD-$07E2: P1 (Mario) score (offsets $06-$0B, $07DD zero-suppressed)
--   $07E3-$07E8: P2 (Luigi) score (offsets $0C-$11, $07E3 zero-suppressed)
-- First byte of each score is always 0 (zero-suppressed leading digit).
-- Ones digit is always 0 (smallest increment is 50). Read 5 middle digits × 10.
local function get_score(base_addr)
	local score = 0
	for i = 0, 4 do
		local digit = mem:read_u8(base_addr + i)
		score = score * 10 + digit
	end
	return score * 10
end

local last_score_p1 = 0
local last_score_p2 = 0

-- RAM monitoring map
local map = {
	score_p1 = {
		addr_start = 0x07DE,
		addr_end = 0x07E2,
		callback = function()
			local score = get_score(0x07DE)
			if score ~= last_score_p1 then
				_G.event(topic_score_p1, string.format("%06d", score))
				last_score_p1 = score
			end
		end,
	},

	score_p2 = {
		addr_start = 0x07E4,
		addr_end = 0x07E8,
		callback = function()
			local score = get_score(0x07E4)
			if score ~= last_score_p2 then
				_G.event(topic_score_p2, string.format("%06d", score))
				last_score_p2 = score
			end
		end,
	},

	-- Sound Effect Detection via Sound Queues
	-- Reference: https://gist.github.com/1wErt3r/4048722 (SMB Disassembly)
	-- The sound engine reads these RAM queues every frame and writes to APU
	sfx = {
		addr_start = 0x00FD,
		addr_end = 0x00FF,
		callback = function(address, current, previous)
			if current ~= 0x00 and current ~= previous then
				local sfx_map = address == 0x00FF and sfx_square1_map
					or address == 0x00FE and sfx_square2_map
					or sfx_noise_map
				local sfx = sfx_map[current]
				if sfx then
					_G.event(topic_sfx .. sfx)
				else
					-- Debug: log unknown SFX values
					local channel = address == 0x00FF and "sq1"
						or address == 0x00FE and "sq2"
						or "noise"
					print(string.format("SFX %s: 0x%02X", channel, current))
				end
			end
		end,
	},

	-- Music detection via MusicDataLow ($F5) - the ROM pointer to current song data
	-- Each song has a unique starting address that identifies it
	music_track = (function()
		local last_song = nil
		-- Map starting $F5 values to song names
		local song_map = {
			[0x1C] = "off",
			[0xF9] = "overworld",
			[0x11] = "underworld",
			[0x72] = "timer-warning",
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
					_G.event(topic_music, song)
					last_song = song
				end
			end,
		}
	end)(),

	-- APU Status Register - detect channel enable/disable for FFT simulation
	-- Reference: https://www.nesdev.org/wiki/APU_registers
	-- $4015 bits: 0=Pulse1, 1=Pulse2, 2=Triangle, 3=Noise, 4=DMC
	-- Note: Cannot monitor write-only sound registers ($4000-$4013) with frame polling
}

ram.install_monitors(map, mem)

