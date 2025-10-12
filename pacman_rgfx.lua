package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

local cpu = manager.machine.devices[":maincpu"]

local function get_player_score(p)
	local mem = cpu.spaces["program"]
	local score = 0
	for i = 3, 0, -1 do -- Read backwards: 3, 2, 1, 0
		local byte = mem:read_u8(0x4E80 + i)
		local hi = math.floor(byte / 16)
		local lo = byte % 16
		score = score * 100 + hi * 10 + lo
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

local map = {
	player_one_score = {
		addr_start = 0x4E80,
		addr_end = 0x4E83,
		callback = make_score_callback(),
	},
}

for name, config in pairs(map) do
	ram.install_ram_monitor(cpu.spaces["program"], config.addr_start, config.addr_end, name, config.callback)
end
