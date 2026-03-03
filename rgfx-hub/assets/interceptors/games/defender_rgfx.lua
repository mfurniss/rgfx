-- Williams Defender RGFX Interceptor
-- Hardware: Motorola MC6809E @ 1MHz (big-endian)
-- RAM: $0000-$BFFF (48 KB), ROM/IO bank-switched at $C000-$CFFF
-- Memory addresses sourced from Aaron Bottegal's Defender disassembly

-- Don't emit events during power-on test
_G.boot_delay(14)

local ram = require("ram")
local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

-- Decode 3-byte BCD score (big-endian, 6 digits, max 999,999)
local function decode_bcd_score(start_addr)
	local score = 0
	for i = 0, 2 do
		local byte = mem:read_u8(start_addr + i)
		local hi = (byte >> 4) & 0x0F
		local lo = byte & 0x0F
		score = score * 100 + hi * 10 + lo
	end
	return score
end

local prev_score = 0

local map = {
	player_one_score = {
		addr_start = 0xA1C3,
		addr_end = 0xA1C5,
		callback_changed = function()
			local score = decode_bcd_score(0xA1C3)
			local delta = score - prev_score
			prev_score = score
			_G.event("defender/player/score/p1", score)
			if delta == 500 then
				_G.event("defender/humanoid/rescue")
			end
		end,
	},
	player_one_lives = {
		addr_start = 0xA1C9,
		callback_changed = function(current, previous)
			_G.event("defender/player/lives", current)
			if current < previous and current >= 0 then
				_G.event("defender/player/die", previous - current)
			end
		end,
	},
	player_one_smart_bombs = {
		addr_start = 0xA1CB,
		callback_changed = function(current, previous)
			_G.event("defender/player/smart-bombs", current)
			if current < previous then
				_G.event("defender/player/smart-bomb-used", previous - current)
			end
		end,
	},

	-- Active laser beam count (0-4 max concurrent beams)
	-- Source: GAMEPLAY_LASERS_RUNNING_COUNT in Bottegal's disassembly
	laser_count = {
		addr_start = 0xA0B5,
		callback_changed = function(current, previous)
			if current > previous then
				_G.event("defender/player/fire", current - previous)
			end
		end,
	},

	-- Humanoid (astronaut) count
	humanoid_count = {
		addr_start = 0xA0FA,
		callback_changed = function(current, previous)
			_G.event("defender/humanoid/count", current)
			if current < previous then
				_G.event("defender/humanoid/lost", previous - current)
			end
			if current == 0 and previous > 0 then
				_G.event("defender/humanoid/all-lost")
			end
		end,
	},

	-- Enemy type counters (live counts)
	lander_count = {
		addr_start = 0xA112,
		callback_changed = function(current, previous)
			_G.event("defender/enemy/lander/count", current)
			if current < previous then
				_G.event("defender/enemy/lander/destroy", previous - current)
			end
		end,
	},
	bomber_count = {
		addr_start = 0xA113,
		callback_changed = function(current, previous)
			_G.event("defender/enemy/bomber/count", current)
			if current < previous then
				_G.event("defender/enemy/bomber/destroy", previous - current)
			end
		end,
	},
	pod_count = {
		addr_start = 0xA114,
		callback_changed = function(current, previous)
			_G.event("defender/enemy/pod/count", current)
			if current < previous then
				_G.event("defender/enemy/pod/destroy", previous - current)
			end
		end,
	},
	mutant_count = {
		addr_start = 0xA115,
		callback_changed = function(current, previous)
			_G.event("defender/enemy/mutant/count", current)
			if current < previous then
				_G.event("defender/enemy/mutant/destroy", previous - current)
			end
		end,
	},
	swarmer_count = {
		addr_start = 0xA116,
		callback_changed = function(current, previous)
			_G.event("defender/enemy/swarmer/count", current)
			if current < previous then
				_G.event("defender/enemy/swarmer/destroy", previous - current)
			end
		end,
	},
	baiter_count = {
		addr_start = 0xA119,
		callback_changed = function(current, previous)
			_G.event("defender/enemy/baiter/count", current)
			if current < previous then
				_G.event("defender/enemy/baiter/destroy", previous - current)
			end
		end,
	},

	-- STATUS register: $7F=alive, $58=exploding, $77=hyperspace, $FF=game over
	player_status = {
		addr_start = 0xA0BA,
		callback_changed = function(current, previous)
			if current == 0x58 and previous ~= 0x58 then
				_G.event("defender/player/explode")
			end
		end,
	},

}

ram.install_monitors(map, mem)
