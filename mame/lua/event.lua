-- Event logging module
-- Writes events to a log file for MQTT bridge consumption

local function get_temp_dir()
	local os_name = package.config:sub(1, 1) == "\\" and "windows" or "unix"
	if os_name == "windows" then
		return os.getenv("TEMP") or os.getenv("TMP") or "C:\\Temp"
	else
		return os.getenv("TMPDIR") or "/tmp"
	end
end

local event_file_path = get_temp_dir() .. (package.config:sub(1, 1) == "\\" and "\\" or "/") .. "rgfx_events.log"

event_file = io.open(event_file_path, "w")
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
