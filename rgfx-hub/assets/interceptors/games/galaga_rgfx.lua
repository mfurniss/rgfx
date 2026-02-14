-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- ram module is loaded via package.path set by rgfx.lua
local ram = require("ram")

-- Set boot delay to skip RAM test phase (16 seconds)
ram.set_boot_delay(16)

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Score delta to event lookup table
-- local SCORE_EVENTS = {
-- 	[50] = "galaga/enemy/destroy/bee",          -- bee in formation
-- 	[80] = "galaga/enemy/destroy/butterfly",    -- butterfly in formation
-- 	[100] = "galaga/enemy/destroy/bee",         -- bee diving (or challenge hit)
-- 	[150] = "galaga/enemy/destroy/boss",        -- boss in formation
-- 	[160] = "galaga/enemy/destroy/butterfly",   -- butterfly diving (or transform individual)
-- 	[400] = "galaga/enemy/destroy/boss",        -- boss diving alone
-- 	[800] = "galaga/enemy/destroy/boss-convoy", -- boss + 1 escort diving
-- 	[1000] = "galaga/bonus/transform",          -- all scorpions destroyed
-- 	[1600] = "galaga/enemy/destroy/boss-convoy", -- boss + 2 escorts diving
-- 	[2000] = "galaga/bonus/transform",          -- all stingrays destroyed
-- 	[3000] = "galaga/bonus/transform",          -- all galaxian flagships destroyed
-- 	-- [10000] = "galaga/bonus/perfect",           -- perfect challenging stage
-- }

-- Galaga Player 1 current score in video RAM at 0x83F8 - 0x83FD
-- Player ship X position at 0x9362 (gameplay buffer, verified via runtime analysis)
--   Range: 0x11 (left edge) to 0xE1 (right edge)
-- Shot counter at 0x9846 (16-bit word, increments when player fires)
-- Hit counter at 0x9844 (increments when enemy destroyed)

local last_score_p1 = 0
local last_score_p2 = 0

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


local map = {
	player_one_score = {
		addr_start = 0x83F8,
		addr_end = 0x83FD,
		callback = function(_, _, _)
			local score = get_galaga_score(0x83F8)
			if score ~= last_score_p1 then
				_G.event("galaga/player/score/p1", score)
				last_score_p1 = score
			end
		end,
	},
	player_two_score = {
		addr_start = 0x83E3,
		addr_end = 0x83E8,
		callback = function(_, _, _)
			local score = get_galaga_score(0x83E3)
			if score ~= last_score_p2 and score > 0 then
				_G.event("galaga/player/score/p2", score)
				last_score_p2 = score
			end
		end,
	},
	-- player_ship_x = {
	-- 	addr_start = 0x9362,
	-- 	callback = function(_, current, _)
	-- 		_G.event("galaga/player/ship/x", current)
	-- 	end,
	-- },
	player_fire = {
		addr_start = 0x9846,
		size = 2,
		callback = function(_, current, previous)
			-- Shot counter increments when player fires
			if current > previous then
				_G.event("galaga/player/fire", current)
			end
		end,
	},
	enemy_destroy = {
		addr_start = 0x9844,
		callback = function(_, current, previous)
			-- Hit counter increments when enemy is destroyed
			if current > previous then
				_G.event("galaga/enemy/destroy", current)
			end
		end,
	},
	-- Tractor beam sound flag at $9AA5 (from hackbar/galaga disassembly: "capture beam sound active")
	beam_sound = {
		addr_start = 0x9AA5,
		callback = function(_, current, previous)
			if current > 0 and previous == 0 then
				_G.event("galaga/boss/tractor-beam", 1)
			elseif current == 0 and previous > 0 then
				_G.event("galaga/boss/tractor-beam", 0)
			end
		end,
	},
	-- Capture flag at ds5_928A_captr_status[4] ($928E)
	fighter_captured = {
		addr_start = 0x928E,
		callback = function(_, current, previous)
			if current == 1 and previous ~= 1 then
				_G.event("galaga/player/captured")
			end
		end,
	},
	-- Perfect bonus music trigger at $9AB4 (b_9AA0 + $14)
	-- Game writes 1 here in gctl_chllng_stg_end() when hit counter == 40
	perfect = {
		addr_start = 0x9AB4,
		callback = function(_, current, previous)
			if current == 1 and previous == 0 then
				_G.event("galaga/bonus/perfect")
			end
		end,
	},
	-- Stage counter at ds_plyr_actv + _b_stgctr ($9820 + $01 = $9821)
	stage = {
		addr_start = 0x9821,
		callback = function(_, current, previous)
			if current == previous + 1 then
				_G.event("galaga/stage", current)
			end
		end,
	},
}

ram.install_monitors(map, mem)

-- Bonus score sprite detection
-- Sprite tile codes at galaga_ram1[0x380] = CPU 0x8B80-0x8BFF
-- 64 sprites, tile code at even offsets, 7-bit (masked with 0x7F)
-- After explosion animation (0x41→0x42→0x43→0x44→0x48), boss kills
-- transition from 0x48 to a bonus tile code:
local BONUS_TILES = {
	[0x34] = 150,
	[0x35] = 400,
	[0x37] = 800,
	[0x38] = 1000,
	[0x39] = 1500,
	[0x3A] = 1600,
	[0x3B] = 2000,
	[0x3C] = 3000,
}

local SPRITE_CODE_BASE = 0x8B80
local prev_tiles = {}

for slot = 0, 63 do
	prev_tiles[slot] = mem:read_u8(SPRITE_CODE_BASE + (slot * 2)) & 0x7F
end

emu.register_frame_done(function()
	if not ram.is_ready() then return end

	for slot = 0, 63 do
		local addr = SPRITE_CODE_BASE + (slot * 2)
		local val = mem:read_u8(addr) & 0x7F

		if val ~= prev_tiles[slot] then
			if prev_tiles[slot] == 0x48 then
				local bonus = BONUS_TILES[val]
				if bonus then
					_G.event("galaga/bonus/score", bonus)
				end
			end
			prev_tiles[slot] = val
		end
	end
end, "sprite_scan")
