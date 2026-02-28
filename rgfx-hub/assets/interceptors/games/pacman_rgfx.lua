-- Don't emit any events during power-on test
_G.boot_delay(6)

-- Extract bonus fruit sprites from ROM (cached after first run)
local sprite_extract = require("sprite-extract")
sprite_extract.extract({
	gfx_region = ":gfx1",
	sprite_offset = 0x1000,
	tile_format = {
		format = "namco",
		width = 16, height = 16,
		bytes_per_sprite = 64,
	},
	color_prom = {
		region = ":proms",
		offset = 0x00,
		count = 32,
		format = "pacman",
	},
	palette_prom = {
		region = ":proms",
		offset = 0x20,
		colors_per_entry = 4,
	},
	-- Pac-Man uses a rotated screen (ROT90 in MAME)
	rotation = 90,
	sprites = {
		-- Bonus fruit (ROM palettes, no color_map)
		{ name = "pac-bonus-1-cherry",     index = 0, palette = 20 },
		{ name = "pac-bonus-2-strawberry", index = 1, palette = 15 },
		{ name = "pac-bonus-3-orange",     index = 2, palette = 21 },
		{ name = "pac-bonus-4-apple",      index = 4, palette = 20 },
		{ name = "pac-bonus-5-melon",      index = 5, palette = 23 },
		{ name = "pac-bonus-6-galaxian",   index = 6, palette = 9 },
		{ name = "pac-bonus-7-bell",       index = 3, palette = 22 },
		{ name = "pac-bonus-8-key",        index = 7, palette = 22 },

		-- Pac-Man 3-frame eating animation (right-facing)
		-- ROM pixel value 3 = body, remapped to PICO-8 0xA (yellow)
		{ name = "pac-right", frames = {
			{ index = 44, color_map = { [3] = 0xA } },  -- fully open mouth
			{ index = 46, color_map = { [3] = 0xA } },  -- half-open mouth
			{ index = 48, color_map = { [3] = 0xA } },  -- closed (circle)
		}},
		-- Dim variant for dot eating
		{ name = "pac-right-dim", frames = {
			{ index = 44, color_map = { [3] = 0x5 } },
			{ index = 46, color_map = { [3] = 0x5 } },
			{ index = 48, color_map = { [3] = 0x5 } },
		}},

		-- Frightened ghost (2-frame blue/white flash)
		-- ROM pixel 2 = body, pixel 3 = face detail
		{ name = "ghost-scared", frames = {
			{ index = 28, color_map = { [2] = 0xC, [3] = 0xF } },  -- blue
			{ index = 29, color_map = { [2] = 0x6, [3] = 0x8 } },  -- white
		}},

		-- Ghost eyes (body masked transparent, only eyes remain)
		-- ROM pixel 3 = body (masked), pixel 1 = sclera, pixel 2 = pupil
		{ name = "ghost-eyes-right", index = 32,
			color_map = { [1] = 0x7, [2] = 0xC }, transparent_pixels = { 3 } },
		{ name = "ghost-eyes-left", index = 36,
			color_map = { [1] = 0x7, [2] = 0xC }, transparent_pixels = { 3 } },
	},
	output_dir = "~/.rgfx/transformers/bitmaps",
})

local ram = require("ram")
local cpu = manager.machine.devices[":maincpu"]

local SCORE_EVENTS = {
	[10] = "dot",
	[50] = "energizer",
	[200] = "ghost1",
	[400] = "ghost2",
	[800] = "ghost3",
	[1600] = "ghost4",
  [100] = "cherry",
  [300] = "strawberry",
  [500] = "orange",
  [700] = "apple",
  [1000] = "melon",
  [2000] = "galaxian",
  [3000] = "bell",
  [5000] = "key"
}

-- Track previous score for delta detection
local last_score = 0

local function get_player_score(dword)
	local score = 0
	-- Score is 3 bytes packed BCD (6 digits, max 999990)
	-- Byte at 0x4E83 is unrelated data, so only decode bytes 0-2
	for i = 2, 0, -1 do
		local byte = (dword >> (i * 8)) & 0xFF
		local hi = (byte >> 4) & 0x0F
		local lo = byte & 0x0F
		score = score * 100 + hi * 10 + lo
	end

	return score
end

local map = {
  	player_eat = {
		addr_start = 0x4E80,
		size = 4,
		callback_changed = function(value, _)
			local score = get_player_score(value)
			local delta = score - last_score

			if delta > 0 then
				local event = SCORE_EVENTS[delta] or SCORE_EVENTS[delta - 10]
				if event then
					_G.event("pacman/player/eat", event)
				end
			end

			last_score = score
		end,
	},

	player_one_score = {
		addr_start = 0x4E80,
		size = 4,
		callback_changed = function(value, _)
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
	-- sound_ch2_cmd = {
	-- 	addr_start = 0x4EAC,
	-- 	callback_changed = function(value, _)
	-- 		if value == 0x21 then
	-- 			_G.event("pacman/player/eat/power-pill")
	-- 		elseif value == 0x61 then
	-- 			_G.event("pacman/ghost/eyes")
	-- 		end
	-- 	end,
	-- },
	sound_ch3_cmd = {
		addr_start = 0x4EBC,
		callback_changed = function(value, _)
			if value == 0x01 or value == 0x02 then
	--			_G.event("pacman/player/eat/pill", value)
			elseif value == 0x10 then
				_G.event("pacman/player/die", 1)
			elseif value == 0x20 then
				_G.event("pacman/player/die", 2)
			elseif value == 0x04 then
--				_G.event("pacman/player/eat/bonus")
			elseif value == 0x08 then
--				_G.event("pacman/player/eat/ghost")
			end
		end,
	},

	game_mode = {
		addr_start = 0x4E00,
		callback_changed = function(value, _)
			_G.event("pacman/game/mode", value) -- 1=demo, 2=select p1/p2 game, 3=game started
		end,
	},
	dots_remaining = {
		addr_start = 0x4E0E,
		callback_changed = function(value, prev_value)
			_G.event("pacman/player/dots-remaining", 244 - value)
			if value == 244 and prev_value == 243 then
				_G.event("pacman/level/complete")
			end
		end,
	},
}

ram.install_monitors(map, cpu.spaces["program"])
