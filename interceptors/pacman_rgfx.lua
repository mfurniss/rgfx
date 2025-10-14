package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

local cpu = manager.machine.devices[":maincpu"]

local function get_player_score(dword)
	local score = 0
	-- Process dword as BCD
	for i = 3, 0, -1 do
		local byte = (dword >> (i * 8)) & 0xFF
		local hi = math.floor(byte / 16)
		local lo = byte % 16
		score = score * 100 + hi * 10 + lo
	end

	return score
end

-- https://github.com/BleuLlama/GameDocs/blob/master/disassemble/mspac.asm

local map = {
	player_one_score = {
		addr_start = 0x4E80,
		addr_end = 0x4E80,
		callback = function(_, current, _)
			local current_score = get_player_score(current)
			_G.publish_mqtt("rgfx/event", "player_one_score " .. current_score)
		end,
		size = 4,
	},
	power_pill = {
		addr_start = 0x4DA6,
		addr_end = 0x4DA6,
		callback = function(_, current, _)
			_G.publish_mqtt("rgfx/event", "power_pill " .. current)
		end,
		size = 1,
	},
	-- power_pill_flash_counter = {
	-- 	addr_start = 0x4DCF,
	-- 	addr_end = 0x4DCF,
	-- 	callback = function(_, current, _)
	-- 		print("POWER PILL FLASH COUNTER", current)
	-- 	end,
	-- 	size = 1,
	-- },
	-- blue_ghost_counter = {
	-- 	addr_start = 0x4DCB,
	-- 	addr_end = 0x4DCB,
	-- 	callback = function(_, current, _)
	-- 		print("Blue ghost counter:", current)
	-- 	end,
	-- 	size = 2,
	-- },
	-- ghost_states = {
	-- 	addr_start = 0x4DA7,
	-- 	addr_end = 0x4DA7,
	-- 	callback = function(_, current, _)
	-- 		print("GHOST STATES", string.format("0x%08X", current))
	-- 	end,
	-- 	size = 4,
	-- },
	-- power_pill_flash_counter = {
	-- 	addr_start = 0x4DCF,
	-- 	addr_end = 0x4DCF,
	-- 	callback = function(_, current, _)
	-- 		print("Flash counter:", current)
	-- 	end,
	-- 	size = 1,
	-- },
	-- GHOST COLORS
	-- 0x01 = red
	-- 0x03 = pink
	-- 0x05 = cyan
	-- 0x07 = orange
	-- 0x11 = blue
	-- 0x12 = white
	red_ghost_color = {
		addr_start = 0x4C03,
		addr_end = 0x4C03,
		-- callback = function(addr, current, previous) end,
	},
	pink_ghost_color = {
		addr_start = 0x4C05,
		addr_end = 0x4C05,
		-- callback = function(addr, current, previous) end,
	},
}

for name, config in pairs(map) do
	ram.install_ram_monitor({
		mem = cpu.spaces["program"],
		start_addr = config.addr_start,
		end_addr = config.addr_end,
		name = name,
		callback = config.callback,
		size = config.size,
	})
end
