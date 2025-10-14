local base_path = debug.getinfo(1, "S").source:sub(2):match("(.*/)") or ""
local interceptors_dir = "interceptors"

package.path = package.path .. ";" .. base_path .. "?.lua"
package.path = package.path .. ";" .. base_path .. interceptors_dir .. "/?.lua"

-- Load event logging module (defines _G.event and event_file)
require("event")

print(emu.app_name() .. " " .. emu.app_version())

for tag, screen in pairs(manager.machine.screens) do
	print(tag)
end

-- Dynamically load game-specific script based on game name
local rom_name = emu.romname()
print("ROM name: " .. rom_name)

local game_script = rom_name .. "_rgfx"
print("Looking for: " .. interceptors_dir .. "/" .. game_script .. ".lua")
local status = pcall(require, game_script)
if status then
	print("Loaded game script: " .. interceptors_dir .. "/" .. game_script .. ".lua")
else
	print("No game-specific script found")
end

local s = manager.machine.screens[":screen"]
print(s.width .. "x" .. s.height)

for tag, device in pairs(manager.machine.devices) do
	print(tag)
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

event("game", rom_name)

local prestart_cb = function()
	print("Machine prestart")
end

local stop_cb = function()
	event_cleanup()
end

emu.register_prestart(prestart_cb)
emu.add_machine_stop_notifier(stop_cb)
