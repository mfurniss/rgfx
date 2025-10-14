local base_path = debug.getinfo(1, "S").source:sub(2):match("(.*/)") or ""
local interceptors_dir = "interceptors"

package.path = package.path .. ";" .. base_path .. "?.lua"
package.path = package.path .. ";" .. base_path .. interceptors_dir .. "/?.lua"

-- autoboot.lua
-- Open a global logfile in macOS temp directory
local logfile_path = "/tmp/mame_out.txt"

_G.logfile = io.open(logfile_path, "w")
if _G.logfile then
	_G.logfile:setvbuf("no") -- flush immediately
	print("Log file opened at: " .. logfile_path)
else
	print("Failed to open log file at: " .. logfile_path)
end

print(emu.app_name() .. " " .. emu.app_version())

for tag, screen in pairs(manager.machine.screens) do
	print(tag)
end

-- Dynamically load game-specific script based on game name
local game_name = emu.romname()
print("Game ROM name: " .. game_name)

local game_script = game_name .. "_rgfx"
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

function _G.publish_mqtt(topic, message)
	-- local cmd = string.format('mosquitto_pub -h localhost -t "%s" -m "%s"', topic, message)
	-- os.execute(cmd)
	if _G.logfile then
		_G.logfile:write(string.format("%s %s\n", topic, message))
	end
end

publish_mqtt("rgfx/game", game_name)

local prestart_cb = function()
	print("Machine prestart")
end

local stop_cb = function()
	if _G.logfile then
		_G.logfile:close()
		_G.logfile = nil
	end
end

emu.register_prestart(prestart_cb)
emu.add_machine_stop_notifier(stop_cb)
