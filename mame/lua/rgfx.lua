-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

local base_path = debug.getinfo(1, "S").source:sub(2):match("(.*/)") or ""
local interceptors_dir = "interceptors"

package.path = package.path .. ";" .. base_path .. "?.lua"
package.path = package.path .. ";" .. base_path .. interceptors_dir .. "/?.lua"

-- Load event logging module (defines _G.event and event_file)
require("event")

print(emu.app_name() .. " " .. emu.app_version())

-- Get ROM name early (available before machine starts)
local rom_name = emu.romname()
print("ROM name: " .. rom_name)

-- Track whether interceptor has been loaded
local interceptor_loaded = false

local load_interceptor = function()
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

	-- Load ROM-to-interceptor mapping
	local rom_map = require("rom_map")

	-- Lookup interceptor: prefer cart_name (console games), fallback to rom_name (arcade)
	local lookup_key = cart_name or rom_name
	local game_script = rom_map[lookup_key]

	if game_script then
		print("Loading interceptor: " .. game_script .. ".lua")
		local status = pcall(require, game_script)
		if status then
			print("Successfully loaded: " .. interceptors_dir .. "/" .. game_script .. ".lua")
		else
			print("ERROR: Failed to load interceptor: " .. game_script .. ".lua")
		end
	else
		print("No interceptor mapping found for: " .. lookup_key)
	end

	-- Debug: Print screen info
	for tag, screen in pairs(manager.machine.screens) do
		print("Screen tag:", tag)
		print("Screen size:", screen.width .. "x" .. screen.height)
		print("Refresh rate (Hz):", screen.refresh)
		break
	end

	-- Publish game event
	event("game", rom_name)
end

local stop_cb = function()
	event_cleanup()
end

-- Try to load interceptor on first frame (prestart doesn't seem to work for NES)
local frame_cb = function()
	if not interceptor_loaded then
		load_interceptor()
		interceptor_loaded = true
	end
end

print("Registering callbacks...")
emu.register_prestart(load_interceptor) -- Try prestart first
emu.add_machine_frame_notifier(frame_cb) -- Fallback to frame callback
emu.add_machine_stop_notifier(stop_cb)
print("Callbacks registered. Waiting for machine to start...")
