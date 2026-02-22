local exports = {}

local size_config = {
	[1] = { method = "read_u8", hex_format = "0x%02X" },
	[2] = { method = "read_u16", hex_format = "0x%04X" },
	[4] = { method = "read_u32", hex_format = "0x%08X" },
}

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

-- Install monitors from a map table
-- Each entry should have addr_start and optionally addr_end, callback, callback_changed, size
function exports.install_monitors(map, mem)
	print("install_monitors called")
	if not map then
		print("ERROR: map is nil")
		return
	end
	if not mem then
		print("ERROR: mem is nil")
		return
	end
	local count = 0
	for name, config in pairs(map) do
		local ok, err = pcall(function()
			exports.install_ram_monitor({
				mem = mem,
				start_addr = config.addr_start,
				end_addr = config.addr_end,
				name = nil, -- Suppress verbose per-monitor logging
				callback = config.callback,
				callback_changed = config.callback_changed,
				size = config.size,
			})
		end)
		if ok then
			count = count + 1
		else
			print(string.format("ERROR installing monitor '%s': %s", name, tostring(err)))
		end
	end
	print(string.format("Installed %d RAM monitors", count))
end

return exports
