package.path = package.path .. ";" .. debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "?.lua"

print(emu.app_name() .. " " .. emu.app_version())

for tag, screen in pairs(manager.machine.screens) do
	print(tag)
end

-- Dynamically load game-specific script based on game name
local game_name = emu.romname()
print("Game ROM name: " .. game_name)

local game_script = game_name .. "_rgfx"
print("Looking for: " .. game_script .. ".lua")
local status = pcall(require, game_script)
if status then
	print("Loaded game script: " .. game_script .. ".lua")
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
