package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"
local ram_mon = require("install_ram_monitor")

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

-- local counter = 0
-- emu.register_frame_done(function()
-- 	counter = counter + 10
-- 	if counter >= screen.refresh then
-- 		counter = 0
-- 		print("Player 1 Score:", get_player_score(0), manager.machine.time)
-- 	end
-- end)

local function on_memory_write(offset, data)
	print(string.format("0x%X", offset), string.format("0x%X", data))
end

local mem = cpu.spaces["program"]

-- mem:install_write_tap(0x4800, 0x4BFF, "w1", on_memory_write)
-- mem:install_write_tap(0x5000, 0x50FF, "w2", on_memory_write)

-- local mem_handler = mem:install_write_tap(0x4E80, 0x4E83, "writes", on_memory_write)

local prev_values = {}
local watch_start = 0x4E80
local watch_end = 0x4E83

-- Initialize previous values
for addr = watch_start, watch_end do
	prev_values[addr] = mem:read_u8(addr)
end

-- Check every frame
emu.register_frame_done(function()
	for addr = watch_start, watch_end do
		local current = mem:read_u8(addr)
		if current ~= prev_values[addr] then
			print(string.format("0x%04X: 0x%02X -> 0x%02X", addr, prev_values[addr], current))
			prev_values[addr] = current
			print("Player 1 Score:", get_player_score(0), manager.machine.time)
		end
	end
end, "ram_monitor")
