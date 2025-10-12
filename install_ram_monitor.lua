local exports = {}

function exports.install_ram_monitor(mem, start_addr, end_addr, name, callback)
	local prev_values = {}
	local active = true

	-- Initialize previous values
	for addr = start_addr, end_addr do
		prev_values[addr] = mem:read_u8(addr)
	end

	-- Register frame callback
	emu.register_frame_done(function()
		if not active then
			return
		end

		for addr = start_addr, end_addr do
			local current = mem:read_u8(addr)
			if current ~= prev_values[addr] then
				callback(addr, current, 0xff)
				prev_values[addr] = current
			end
		end
	end, name)

	-- Return a handle object
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
