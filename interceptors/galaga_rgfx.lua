package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

local cpu = manager.machine.devices[":maincpu"]

local function get_player_score(p)
	local mem = cpu.spaces["program"]
	local score = 0
	-- Galaga current player score in video RAM at 0x83F8+ (6 digits)
	-- 0x83F8 = units place, ascending for higher digits
	-- Values 0-9 map to themselves, 24 = blank
	-- Reading from highest digit to lowest
	for i = 5, 0, -1 do
		local digit = mem:read_u8(0x83F8 + i)
		if digit >= 0 and digit <= 9 then
			score = score * 10 + digit
		elseif digit == 24 then
			-- blank, treat as 0
			score = score * 10
		end
	end
	return score
end

local function make_score_callback()
	local last_score = nil
	return function(offset, data)
		local current_score = get_player_score(0)
		if current_score ~= last_score then
			print("Player 1 Score:", current_score, manager.machine.time)
			last_score = current_score
		end
	end
end

-- Galaga Player 1 current score in video RAM at 0x83F8 - 0x83FD
local map = {
	player_one_score = {
		addr_start = 0x83F8,
		addr_end = 0x83FD,
		callback = make_score_callback(),
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
