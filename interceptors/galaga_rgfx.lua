package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

local cpu = manager.machine.devices[":maincpu"]

local function make_score_callback(start_addr, end_addr)
	local mem = cpu.spaces["program"]
	local last_score = nil
	local num_digits = end_addr - start_addr + 1

	return function(_, _, _)
		local score = 0
		-- Galaga score in video RAM
		-- start_addr = units place, ascending for higher digits
		-- Values 0-9 map to themselves, 24 = blank
		-- Reading from highest digit to lowest
		for i = num_digits - 1, 0, -1 do
			local digit = mem:read_u8(start_addr + i)
			if digit >= 0 and digit <= 9 then
				score = score * 10 + digit
			elseif digit == 24 then
				-- blank, treat as 0
				score = score * 10
			end
		end

		if score ~= last_score then
			print("Player 1 Score:", score)
			last_score = score
		end
	end
end

-- Galaga Player 1 current score in video RAM at 0x83F8 - 0x83FD
local map = {
	player_one_score = {
		addr_start = 0x83F8,
		addr_end = 0x83FD,
	},
}

for name, config in pairs(map) do
	ram.install_ram_monitor({
		mem = cpu.spaces["program"],
		start_addr = config.addr_start,
		end_addr = config.addr_end,
		name = name,
		callback = make_score_callback(config.addr_start, config.addr_end),
	})
end
