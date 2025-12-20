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

	return rgfx_dir .. separator .. "interceptor_events.log"
end

local event_file_path = get_event_file_path()

local event_file = io.open(event_file_path, "w")
if event_file then
	event_file:setvbuf("no") -- flush immediately
	print("Event file opened at: " .. event_file_path)
else
	print("Failed to open event file at: " .. event_file_path)
end

local write_error_count = 0
local MAX_WRITE_ERRORS = 3
local event_count = 0
local last_file_check = os.time()
local FILE_CHECK_INTERVAL = 5 -- Check every 5 seconds

-- Check if file exists on disk
local function file_exists(path)
	local f = io.open(path, "r")
	if f then
		f:close()
		return true
	end
	return false
end

-- Global event function for use in game scripts
function _G.event(topic, message)
	-- Periodically verify file still exists on disk
	local now = os.time()
	if now - last_file_check >= FILE_CHECK_INTERVAL then
		last_file_check = now
		if not file_exists(event_file_path) then
			print("WARNING: Event file disappeared from disk. Recreating...")
			-- Close stale handle
			pcall(function()
				if event_file then
					event_file:close()
				end
			end)
			-- Recreate file
			event_file = io.open(event_file_path, "w")
			if event_file then
				event_file:setvbuf("no")
				write_error_count = 0
				print("Event file recreated successfully")
			else
				event_file = nil
				print("ERROR: Failed to recreate event file")
			end
		end
	end
	if not event_file then
		-- Attempt to reopen file
		event_file = io.open(event_file_path, "a") -- Append mode
		if not event_file then
			print("ERROR: Cannot reopen event file at " .. event_file_path)
			return
		end
		event_file:setvbuf("no")
		print("Event file reopened after closure")
		write_error_count = 0
	end

	event_count = event_count + 1

	-- Output event to console
	if message ~= nil then
		print(string.format("%s %s", topic, message))
	else
		print(topic)
	end

	-- Wrap entire write operation in pcall for maximum robustness
	local ok, result, err = pcall(function()
		-- Lua's io.write() returns the file handle on success, nil + error on failure
		-- Note: setvbuf("no") already disables buffering, so flush() is redundant
		local line = message ~= nil and string.format("%s %s\n", topic, message) or string.format("%s\n", topic)
		local handle, write_err = event_file:write(line)
		if not handle then
			return nil, write_err
		end
		return true
	end)

	-- Check if pcall succeeded and write/flush succeeded
	if not ok or not result then
		write_error_count = write_error_count + 1
		local error_msg = err or (result and result or "unknown error")
		print(
			string.format(
				"ERROR writing event #%d [%s %s]: %s (failure %d/%d)",
				event_count,
				topic,
				tostring(message),
				error_msg,
				write_error_count,
				MAX_WRITE_ERRORS
			)
		)

		if write_error_count >= MAX_WRITE_ERRORS then
			print("Max write errors reached, attempting recovery...")
			-- Safely close existing handle
			pcall(function()
				if event_file then
					event_file:close()
				end
			end)

			-- Attempt to reopen
			event_file = io.open(event_file_path, "a")
			if event_file then
				event_file:setvbuf("no")
				write_error_count = 0
				print("Event file recovered successfully")
			else
				event_file = nil
				print("FATAL: Cannot recover event file - all events will be lost!")
			end
		end
	else
		-- Success - reset error counter
		write_error_count = 0
		if event_count % 500 == 0 then
			print(string.format("Events written: %d", event_count))
		end
	end
end

-- Cleanup function to be called on shutdown
function _G.event_cleanup()
	if event_file then
		event_file:close()
		event_file = nil
	end
end
