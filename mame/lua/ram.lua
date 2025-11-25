-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at http://mozilla.org/MPL/2.0/.
--
-- Copyright (c) 2025 Matt Furniss <furniss@gmail.com>

local exports = {}

local size_config = {
	[1] = { method = "read_u8", hex_format = "0x%02X" },
	[2] = { method = "read_u16", hex_format = "0x%04X" },
	[4] = { method = "read_u32", hex_format = "0x%08X" },
}

-- Global delay configuration (set by interceptors before installing monitors)
local delay_enabled = false
local delay_start_time = 0
local delay_duration_seconds = 0
local last_countdown_second = -1

function exports.set_boot_delay(seconds)
	if seconds > 0 then
		delay_enabled = true
		delay_start_time = 0 -- Will be set on first frame
		delay_duration_seconds = seconds
		print(string.format("RAM monitoring delayed: %d seconds", seconds))
	end
end

-- Set a global boot delay before RAM monitoring begins
-- Call this BEFORE installing any monitors to skip boot/test phases
-- Displays a countdown timer and activates monitoring after delay expires
--
-- Usage:
--   ram.set_boot_delay(17)  -- Delay 17 seconds for Galaga boot test
--
-- Parameters:
--   seconds: number of seconds to delay (0 = no delay)

-- Install a RAM monitor that tracks memory changes
--
-- options:
--   mem (required): memory space
--   start_addr (required): starting address
--   end_addr (optional): ending address, defaults to start_addr
--   name (optional): name for the monitor
--   callback (optional): callback(addr, current_value, previous_value) - called on every change
--   callback_changed (optional): callback_changed(current_value, previous_value) - simpler signature for single-address monitors
--   size (optional): 1 (byte), 2 (word), or 4 (dword) - defaults to 1
function exports.install_ram_monitor(options)
	local mem = options.mem
	local start_addr = options.start_addr
	local end_addr = options.end_addr or start_addr
	local name = options.name
	local callback = options.callback
	local callback_changed = options.callback_changed
	local size = options.size or 1

	if not mem then
		error("mem is required")
	end
	if not start_addr then
		error("start_addr is required")
	end

	local config = size_config[size]
	if not config then
		error(string.format("Invalid size %d. Must be 1, 2, or 4", size))
	end

	local read_func = mem[config.method]
	local hex_format = config.hex_format

	if name then
		print(
			string.format(
				"Installing RAM monitor '%s' (size=%d): 0x%04X - 0x%04X",
				name,
				size,
				start_addr,
				end_addr
			)
		)
	end

	local prev_values = {}
	local active = true

	for addr = start_addr, end_addr, size do
		prev_values[addr] = read_func(mem, addr)
	end

	emu.register_frame_done(function()
		-- Handle global boot delay countdown
		if delay_enabled then
			-- Initialize start time on first frame
			if delay_start_time == 0 then
				delay_start_time = os.time()
			end

			local elapsed = os.time() - delay_start_time
			local remaining = delay_duration_seconds - elapsed

			if remaining > 0 then
				-- Print countdown once per second
				if remaining ~= last_countdown_second then
					last_countdown_second = remaining
					print(
						string.format(
							"RAM monitoring starts in %d second%s...",
							remaining,
							remaining == 1 and "" or "s"
						)
					)
				end
				return -- Skip monitoring during delay
			else
				-- Delay expired, activate monitoring
				if delay_enabled then
					print("RAM monitoring ACTIVE")
					delay_enabled = false
				end
			end
		end

		if not active then
			return
		end

		for addr = start_addr, end_addr, size do
			local current = read_func(mem, addr)

			if current ~= prev_values[addr] then
				if name then
					-- print(name, string.format(hex_format, current))
				end
				if callback then
					callback(addr, current, prev_values[addr])
				end
				if callback_changed then
					callback_changed(current, prev_values[addr])
				end
				prev_values[addr] = current
			end
		end
	end, name)

	return {
		remove = function()
			active = false
		end,
		enable = function()
			active = true
		end,
		disable = function()
			active = false
		end,
	}
end

return exports
