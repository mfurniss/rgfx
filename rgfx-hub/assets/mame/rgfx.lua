-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- RGFX MAME Bootstrap
-- This file is the entry point for MAME's -autoboot_script option.
-- It loads system modules from the app bundle and user interceptors from ~/.rgfx/interceptors/

-- System modules path (where this file lives - app bundle)
local system_path = debug.getinfo(1, "S").source:sub(2):match("(.*/)") or "./"

-- User interceptors path (~/.rgfx/interceptors/)
local home = os.getenv("HOME") or os.getenv("USERPROFILE")
if not home then
	error("Could not determine home directory")
end
local user_path = home .. "/.rgfx/interceptors/"

-- Load system modules from bundle (event.lua, ram.lua)
package.path = system_path .. "?.lua;" .. package.path

-- Load user files from ~/.rgfx/interceptors/ (rom_map.lua, game interceptors)
package.path = user_path .. "?.lua;" .. user_path .. "games/?.lua;" .. package.path

-- Load event logging module (defines _G.event and event_file)
require("event")

-- Initialize RGFX namespace for globals
_G.rgfx = _G.rgfx or {}

print(emu.app_name() .. " " .. emu.app_version())

-- Get ROM name early (available before machine starts)
local rom_name = emu.romname()
print("ROM name: " .. rom_name)

-- Track whether interceptor has been loaded
local interceptor_loaded = false

local load_interceptor = function()
	if interceptor_loaded then
		return
	end
	interceptor_loaded = true

	print("Machine prestart - initializing interceptor...")

	-- Check for loaded cartridges (console systems like NES, Genesis, SNES, etc.)
	local cart_name = nil
	print("Checking for loaded cartridges...")

	-- Debug: enumerate all image devices
	local image_count = 0
	for tag, image in pairs(manager.machine.images) do
		image_count = image_count + 1
		print("Image device [" .. image_count .. "]: " .. tag)
		print("  exists: " .. tostring(image.exists))
		if image.filename then
			print("  filename: " .. image.filename)
		else
			print("  filename: nil")
		end

		if image.exists and image.filename then
			print("Found loaded cartridge: " .. tag .. " -> " .. image.filename)
			-- Extract basename without extension from full path
			-- Example: "/path/to/smb.nes" -> "smb"
			local basename = image.filename:match("([^/\\]+)$")
			if basename then
				cart_name = basename:match("(.+)%..+$") or basename
				print("Cartridge detected: " .. cart_name)
				break
			end
		end
	end

	if image_count == 0 then
		print("No image devices found!")
	end

	-- Load ROM-to-interceptor mapping from user directory
	local rom_map = require("rom_map")

	-- Lookup interceptor: prefer cart_name (console games), fallback to rom_name (arcade)
	local lookup_key = cart_name or rom_name
	local game_script = rom_map[lookup_key]

	-- If no mapping found, try loading {lookup_key}_rgfx as fallback
	if not game_script then
		local fallback_script = lookup_key .. "_rgfx"
		print("No mapping in rom_map for: " .. lookup_key .. ", trying fallback: " .. fallback_script)
		game_script = fallback_script
	end

	print("Loading interceptor: " .. game_script .. ".lua")
	-- Set game name in global scope so interceptor can use it for event prefixes
	_G.rgfx.rom = lookup_key
	local status = pcall(require, game_script)
	if status then
		print("Successfully loaded interceptor: " .. game_script .. ".lua")
		-- Emit game init event AFTER interceptor loads so Hub can load the game mapper
		-- Use lookup_key (cart_name for consoles, rom_name for arcade) to match event prefixes
		event(lookup_key .. "/init", lookup_key)
	else
		print("No interceptor found for: " .. lookup_key .. " (tried " .. game_script .. ".lua)")
	end

	-- Debug: Print first screen info (use pairs iterator to get first element from MAME enumerator)
	local screens_iter = pairs(manager.machine.screens)
	local tag, screen = screens_iter(manager.machine.screens)
	if screen then
		print("Screen tag:", tag)
		print("Screen size:", screen.width .. "x" .. screen.height)
		print("Refresh rate (Hz):", screen.refresh)
	end
end

local stop_cb = function()
	if _G.rgfx.rom then
		event(_G.rgfx.rom .. "/shutdown")
	end
	event_cleanup()
end

-- Try to load interceptor on first frame (prestart doesn't seem to work for NES)
local frame_cb = function()
	load_interceptor()
end

print("Registering callbacks...")
emu.register_prestart(load_interceptor) -- Try prestart first
emu.add_machine_frame_notifier(frame_cb) -- Fallback to frame callback
emu.add_machine_stop_notifier(stop_cb)
print("Callbacks registered. Waiting for machine to start...")
