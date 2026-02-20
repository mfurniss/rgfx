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
	-- Reset clears timers, state, and all driver effects (UDP + MQTT QoS 2).
	-- Sent before loading so any in-flight effects from a previous game are killed.
	event("rgfx/reset", lookup_key)

	local status, err = pcall(require, game_script)
	if status then
		print("Successfully loaded interceptor: " .. game_script .. ".lua")
		-- Delay init ~500ms (30 frames) so MQTT clears reach drivers before new effects
		local init_frames = 0
		emu.register_frame_done(function()
			init_frames = init_frames + 1
			if init_frames >= 30 then
				event(lookup_key .. "/init", lookup_key)
				init_frames = -9999 -- one-shot guard
			end
		end, "init_delay")
	else
		local error_msg = tostring(err)
		print("Error loading interceptor: " .. error_msg)
		event("rgfx/interceptor/error", error_msg)
	end

end

-- Print screen info (wait for screen to initialize before reading properties)
local screen_info_printed = false
local frame_count = 0
local function print_screen_info()
	if screen_info_printed then return end

	frame_count = frame_count + 1
	-- Wait a few frames for screen to fully initialize
	if frame_count < 10 then return end

	local video = manager.machine.video
	if not video then return end

	local width, height = video:snapshot_size()
	if width > 0 and height > 0 then
		-- Get first screen using pairs iterator
		local iter, screens = pairs(manager.machine.screens)
		local tag, screen = iter(screens)
		if screen then
			local fp = screen.frame_period
			if fp and fp > 0 and fp < 1 then
				print(string.format("Screen: %s %dx%d @ %.2f Hz", tag, width, height, 1 / fp))
			else
				print(string.format("Screen: %s %dx%d", tag, width, height))
			end
		end
		screen_info_printed = true
	end
end

-- Try to load interceptor on first frame (prestart doesn't seem to work for NES)
local frame_cb = function()
	load_interceptor()
	print_screen_info()
end

print("Registering callbacks...")
emu.register_prestart(load_interceptor) -- Try prestart first
emu.add_machine_frame_notifier(frame_cb) -- Fallback to frame callback for interceptor
emu.register_frame_done(print_screen_info, "screen_info") -- Called every frame until done
print("Callbacks registered. Waiting for machine to start...")
