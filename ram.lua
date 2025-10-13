local exports = {}

local size_config = {
	[1] = {
		read_func = function(mem, addr)
			return mem:read_u8(addr)
		end,
		hex_format = "0x%02X",
	},
	[2] = {
		read_func = function(mem, addr)
			return mem:read_u16(addr)
		end,
		hex_format = "0x%04X",
	},
	[4] = {
		read_func = function(mem, addr)
			return mem:read_u32(addr)
		end,
		hex_format = "0x%08X",
	},
}

-- size: 1 (byte), 2 (word), or 4 (dword) - defaults to 1
-- callback receives: callback(addr, current_value, previous_value)
function exports.install_ram_monitor(mem, start_addr, end_addr, name, callback, size)
	size = size or 1

	local config = size_config[size]

	if not config then
		error(string.format("Invalid size %d. Must be 1, 2, or 4", size))
	end

	local read_func = config.read_func
	local hex_format = config.hex_format

	print(string.format("Installing RAM monitor '%s' (size=%d): 0x%04X - 0x%04X", name, size, start_addr, end_addr))

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
				print(string.format(hex_format, current))
				callback(addr, current, prev_values[addr])
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
