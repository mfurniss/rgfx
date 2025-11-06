-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

-- Event logging module
-- Writes events to a log file for MQTT bridge consumption

local function get_event_file_path()
	local os_name = package.config:sub(1, 1) == "\\" and "windows" or "unix"
	local home = os.getenv("HOME") or os.getenv("USERPROFILE")
	local separator = os_name == "windows" and "\\" or "/"

	if not home then
		error("Could not determine home directory")
	end

	local rgfx_dir = home .. separator .. ".rgfx"

	-- Create .rgfx directory if it doesn't exist
	os.execute((os_name == "windows" and "mkdir " or "mkdir -p ") .. rgfx_dir)

	return rgfx_dir .. separator .. "mame_events.log"
end

local event_file_path = get_event_file_path()

local event_file = io.open(event_file_path, "w")
if event_file then
	event_file:setvbuf("no") -- flush immediately
	print("Event file opened at: " .. event_file_path)
else
	print("Failed to open event file at: " .. event_file_path)
end

-- Global event function for use in game scripts
function _G.event(topic, message)
	if event_file then
		event_file:write(string.format("%s %s\n", topic, message))
	end
end

-- Cleanup function to be called on shutdown
function _G.event_cleanup()
	if event_file then
		event_file:close()
		event_file = nil
	end
end
