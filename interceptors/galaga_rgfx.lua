package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

local cpu = manager.machine.devices[":maincpu"]
local mem = cpu.spaces["program"]

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

-- Galaga Player 1 current score in video RAM at 0x83F8 - 0x83FD
local map = {
	player_one_score = {
		addr_start = 0x83F8,
		addr_end = 0x83FD,
		callback = function(_, _, _)
			local score = get_galaga_score(0x83F8)
			_G.publish_mqtt("rgfx/event/player_one_score", score)
		end,
	},
}

for name, config in pairs(map) do
	ram.install_ram_monitor({
		mem = cpu.spaces["program"],
		start_addr = config.addr_start,
		end_addr = config.addr_end,
		name = name,
		callback = config.callback,
	})
end
