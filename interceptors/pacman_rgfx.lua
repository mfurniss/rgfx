package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

local cpu = manager.machine.devices[":maincpu"]

local function get_player_score(dword)
	local score = 0
	-- Process 4 bytes (32 bits) as BCD
	for i = 3, 0, -1 do
		local byte = (dword >> (i * 8)) & 0xFF
		local hi = math.floor(byte / 16)
		local lo = byte % 16
		score = score * 100 + hi * 10 + lo
	end
	return score
end

local function make_score_callback()
	return function(_, current, _)
		local current_score = get_player_score(current)

		local s = string.format("Player 1 Score: %s", current_score)
		print(s)
		if _G.logfile then
			_G.logfile:write(s .. "\n")
		end
	end
end

local map = {
	player_one_score = {
		addr_start = 0x4E80,
		addr_end = 0x4E80,
		callback = make_score_callback(),
		size = 4,
	},
}

for name, config in pairs(map) do
	ram.install_ram_monitor(cpu.spaces["program"], config.addr_start, config.addr_end, name, config.callback, config.size)
end
