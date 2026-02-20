-- Galaga '88 Sound Diagnostic (v15)
-- Bank probe found: TRIRAM at maincpu bank 1 = CPU 0x3000-0x37FF
--                   CUS30 at maincpu bank 1 = CPU 0x2000-0x23FF
-- Install write taps at the CORRECT addresses with PC capture.

_G.boot_delay(6)

local c117 = manager.machine.devices[":c117"]
local c117_mem = c117.spaces["program"]
local maincpu = manager.machine.devices[":maincpu"]
local main_mem = maincpu.spaces["program"]

local frame = 0
local active = false
local DELAY = 60  -- Short delay, bank mapping is stable from frame 100+

local MAX_LOG = 3000
local log_count = 0
local pc_stats = {}

local function log_write(cpu_name, cpu_dev, offset, data)
	if not active or log_count >= MAX_LOG then return end
	if data == 0 then return end

	log_count = log_count + 1
	local pc = 0
	pcall(function() pc = cpu_dev.state["PC"].value end)

	local region, rel
	if offset >= 0x3000 and offset <= 0x37FF then
		region = "TRI"
		rel = offset - 0x3000
	elseif offset >= 0x2000 and offset <= 0x23FF then
		region = "CUS"
		rel = offset - 0x2000
	else
		return
	end

	local key = string.format("%s:%04X", cpu_name, pc)
	if not pc_stats[key] then
		pc_stats[key] = { count = 0, first_frame = frame, samples = {} }
	end
	local st = pc_stats[key]
	st.count = st.count + 1
	if #st.samples < 8 then
		table.insert(st.samples, string.format("f=%d %s+%03X=0x%02X", frame, region, rel, data))
	end

	print(string.format("[f=%d] %s PC=%04X %s+%03X=0x%02X",
		frame, cpu_name, pc, region, rel, data))
end

-- Write taps on maincpu at discovered addresses
local ok1, err1 = pcall(function()
	main_mem:install_write_tap(0x3000, 0x37FF, "main_tri", function(offset, data, mask)
		log_write("MAIN", maincpu, offset, data)
	end)
end)
local ok2, err2 = pcall(function()
	main_mem:install_write_tap(0x2000, 0x23FF, "main_cus", function(offset, data, mask)
		log_write("MAIN", maincpu, offset, data)
	end)
end)

print(string.format("[DIAG] maincpu TRIRAM tap (0x3000): %s", ok1 and "OK" or tostring(err1)))
print(string.format("[DIAG] maincpu CUS30 tap (0x2000): %s", ok2 and "OK" or tostring(err2)))

-- Also try subcpu at same addresses (might have different bank config)
local subcpu, sub_mem
pcall(function()
	subcpu = manager.machine.devices[":subcpu"]
	sub_mem = subcpu.spaces["program"]
end)
if sub_mem then
	pcall(function()
		sub_mem:install_write_tap(0x3000, 0x37FF, "sub_tri", function(offset, data, mask)
			log_write("SUB", subcpu, offset, data)
		end)
	end)
	pcall(function()
		sub_mem:install_write_tap(0x2000, 0x23FF, "sub_cus", function(offset, data, mask)
			log_write("SUB", subcpu, offset, data)
		end)
	end)
end

-- Frame polling as reference
local TRIRAM = 0x2FF000
local TRIRAM_SIZE = 0x110
local CHANNELS = {
	{ cmd = 0x000, trig = 0x00B, name = "D" },
	{ cmd = 0x02B, trig = 0x02C, name = "A" },
	{ cmd = 0x02D, trig = 0x02E, name = "B" },
	{ cmd = 0x100, trig = 0x101, name = "C" },
	{ cmd = 0x102, trig = 0x103, name = "E" },
}
local tri_prev, tri_curr = {}, {}
for i = 0, TRIRAM_SIZE - 1 do tri_prev[i] = 0; tri_curr[i] = 0 end

local first = true
local printed_summary = false

emu.register_frame_done(function()
	frame = frame + 1

	if not active and frame >= DELAY then
		active = true
		print(string.format("[DIAG] Logging active at frame %d", frame))
	end

	-- Frame poll
	local rd = c117_mem.read_u8
	tri_prev, tri_curr = tri_curr, tri_prev
	for i = 0, TRIRAM_SIZE - 1 do
		tri_curr[i] = rd(c117_mem, TRIRAM + i)
	end
	if first then first = false; return end

	for _, ch in ipairs(CHANNELS) do
		local tp = tri_prev[ch.trig]
		local tc = tri_curr[ch.trig]
		if (tc & 0x80) ~= 0 and (tp & 0x80) == 0 then
			print(string.format("[f=%d] POLL ch=%s cmd=0x%02X param=0x%02X",
				frame, ch.name, tri_curr[ch.cmd], tc & 0x7F))
		end
	end

	-- Print summary at end or when log full
	if not printed_summary and (log_count >= MAX_LOG or frame > 2500) then
		printed_summary = true
		print(string.format("[DIAG] === PC SUMMARY (%d writes) ===", log_count))
		local sorted = {}
		for k, v in pairs(pc_stats) do
			table.insert(sorted, { key = k, count = v.count, first = v.first_frame, samples = v.samples })
		end
		table.sort(sorted, function(a, b) return a.count > b.count end)
		for _, entry in ipairs(sorted) do
			print(string.format("  %s: %d writes (first f=%d)", entry.key, entry.count, entry.first))
			for _, s in ipairs(entry.samples) do
				print(string.format("    %s", s))
			end
		end
	end
end, "galaga88_diag")

print("[DIAG] Galaga '88 sound diagnostic v15 loaded.")
print("[DIAG] Write taps at CORRECT addresses: TRIRAM=0x3000, CUS30=0x2000")
