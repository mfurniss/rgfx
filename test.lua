package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram = require("ram")

print(emu.app_name() .. " " .. emu.app_version())

for tag, screen in pairs(manager.machine.screens) do
	print(tag)
end

local s = manager.machine.screens[":screen"]
print(s.width .. "x" .. s.height)

for tag, device in pairs(manager.machine.devices) do
	print(tag)
end

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

-- Enumerate screens (most games have one with tag ':screen')
for tag, screen in pairs(manager.machine.screens) do
	print("Screen tag:", tag)
	print("Refresh rate (Hz):", screen.refresh)
	break
end

local screen = manager.machine.screens[":screen"]
print(screen)
local fps = 1 / screen.refresh
print(fps)

local function on_memory_write(addr, data)
	-- print(string.format("0x%04X: 0x%02X", addr, data))
	print("Player 1 Score:", get_player_score(0), manager.machine.time)
end

local monitor = ram.install_ram_monitor(cpu.spaces["program"], 0x4E80, 0x4E83, "ram_monitor", on_memory_write)
